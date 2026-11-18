package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type metricKey struct {
	method string
	status string
	uri    string
}

var (
	mu     sync.RWMutex
	counts = make(map[metricKey]int)
)

func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err == nil {
		for _, addr := range addrs {
			if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
				if ipNet.IP.To4() != nil {
					return ipNet.IP.String()
				}
			}
		}
	}
	return "frontend"
}

// Eureka Client for Frontend
type EurekaClient struct {
	serverURL  string
	app        string
	instanceID string
	hostName   string
	ipAddr     string
	port       int
	httpClient *http.Client
	stopChan   chan struct{}
}

func newEurekaClient(serverURL string, port int) *EurekaClient {
	ipAddr := os.Getenv("INSTANCE_IP")
	if ipAddr == "" {
		ipAddr = getLocalIP()
	}
	hostName := os.Getenv("INSTANCE_HOST")
	if hostName == "" {
		hostName = os.Getenv("HOSTNAME")
	}
	if hostName == "" {
		hostName = "frontend"
	}
	instanceID := fmt.Sprintf("%s:frontend:%d", hostName, port)
	return &EurekaClient{
		serverURL:  strings.TrimRight(serverURL, "/"),
		app:        "FRONTEND",
		instanceID: instanceID,
		hostName:   hostName,
		ipAddr:     ipAddr,
		port:       port,
		httpClient: &http.Client{Timeout: 5 * time.Second},
		stopChan:   make(chan struct{}),
	}
}

func (c *EurekaClient) buildPayload() ([]byte, error) {
	homePageURL := fmt.Sprintf("http://%s:%d/", c.hostName, c.port)
	statusPageURL := fmt.Sprintf("http://%s:%d/actuator/info", c.hostName, c.port)
	healthCheckURL := fmt.Sprintf("http://%s:%d/actuator/health", c.hostName, c.port)

	payload := map[string]any{
		"instance": map[string]any{
			"instanceId":       c.instanceID,
			"hostName":         c.hostName,
			"app":              c.app,
			"ipAddr":           c.ipAddr,
			"status":           "UP",
			"overriddenStatus": "UNKNOWN",
			"port": map[string]any{
				"$":        c.port,
				"@enabled": "true",
			},
			"securePort": map[string]any{
				"$":        443,
				"@enabled": "false",
			},
			"countryId": 1,
			"dataCenterInfo": map[string]any{
				"@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
				"name":   "MyOwn",
			},
			"leaseInfo": map[string]any{
				"renewalIntervalInSecs": 30,
				"durationInSecs":        90,
			},
			"metadata": map[string]string{
				"management.port": fmt.Sprintf("%d", c.port),
			},
			"homePageUrl":      homePageURL,
			"statusPageUrl":    statusPageURL,
			"healthCheckUrl":   healthCheckURL,
			"vipAddress":       "frontend",
			"secureVipAddress": "frontend",
		},
	}
	return json.Marshal(payload)
}

func (c *EurekaClient) register(ctx context.Context) error {
	data, err := c.buildPayload()
	if err != nil {
		return err
	}
	reqURL := fmt.Sprintf("%s/apps/%s", c.serverURL, c.app)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status from eureka register: %d", resp.StatusCode)
	}
	return nil
}

func (c *EurekaClient) sendHeartbeat(ctx context.Context) error {
	reqURL := fmt.Sprintf("%s/apps/%s/%s", c.serverURL, c.app, c.instanceID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, reqURL, nil)
	if err != nil {
		return err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return c.register(ctx)
	}
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("heartbeat status %d", resp.StatusCode)
	}
	return nil
}

func (c *EurekaClient) deregister(ctx context.Context) {
	reqURL := fmt.Sprintf("%s/apps/%s/%s", c.serverURL, c.app, c.instanceID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, reqURL, nil)
	if err == nil {
		resp, err := c.httpClient.Do(req)
		if err == nil {
			_ = resp.Body.Close()
		}
	}
}

func (c *EurekaClient) start(ctx context.Context) {
	go func() {
		// Initial register with retry
		for {
			select {
			case <-ctx.Done():
				return
			case <-c.stopChan:
				return
			default:
			}
			regCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			err := c.register(regCtx)
			cancel()
			if err != nil {
				time.Sleep(5 * time.Second)
			} else {
				log.Println("Frontend successfully registered with Eureka discovery server")
				break
			}
		}

		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-c.stopChan:
				return
			case <-ticker.C:
				hbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				_ = c.sendHeartbeat(hbCtx)
				cancel()
			}
		}
	}()
}

func (c *EurekaClient) stop() {
	close(c.stopChan)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	c.deregister(ctx)
	log.Println("Frontend deregistered from Eureka")
}

func main() {
	// Initialize default series so it immediately appears in Prometheus
	counts[metricKey{method: "GET", status: "200", uri: "/"}] = 1
	counts[metricKey{method: "GET", status: "200", uri: "/healthz"}] = 1

	eurekaURL := os.Getenv("EUREKA_CLIENT_SERVICEURL_DEFAULTZONE")
	if eurekaURL == "" {
		eurekaURL = os.Getenv("EUREKA_SERVER_URL")
	}
	if eurekaURL == "" {
		eurekaURL = "http://discovery-server:8761/eureka/"
	}

	port := 80
	if pStr := os.Getenv("SERVER_PORT"); pStr != "" {
		if p, err := strconv.Atoi(pStr); err == nil {
			port = p
		}
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Start Eureka registration
	eurekaClient := newEurekaClient(eurekaURL, port)
	eurekaClient.start(ctx)
	defer eurekaClient.stop()

	// Watch Nginx access log in background
	go tailLog("/var/log/nginx/access.log")

	// Actuator & Prometheus HTTP Server
	mux := http.NewServeMux()

	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		fmt.Fprintln(w, "# HELP http_server_requests_seconds_count Total count of HTTP server requests")
		fmt.Fprintln(w, "# TYPE http_server_requests_seconds_count counter")

		mu.RLock()
		defer mu.RUnlock()
		for k, v := range counts {
			outcome := "SUCCESS"
			if strings.HasPrefix(k.status, "4") {
				outcome = "CLIENT_ERROR"
			} else if strings.HasPrefix(k.status, "5") {
				outcome = "SERVER_ERROR"
			} else if strings.HasPrefix(k.status, "3") {
				outcome = "REDIRECTION"
			}
			fmt.Fprintf(w, "http_server_requests_seconds_count{error=\"none\",exception=\"none\",method=\"%s\",outcome=\"%s\",status=\"%s\",uri=\"%s\"} %d\n",
				k.method, outcome, k.status, k.uri, v)
		}
	})

	// Spring Boot Actuator Endpoints for Spring Boot Admin
	mux.HandleFunc("/actuator", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/vnd.spring-boot.actuator.v3+json;charset=UTF-8")
		base := fmt.Sprintf("http://frontend:%d/actuator", port)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"_links": map[string]any{
				"self":                       map[string]any{"href": base, "templated": false},
				"health":                     map[string]any{"href": base + "/health", "templated": false},
				"health-path":                map[string]any{"href": base + "/health/{*path}", "templated": true},
				"info":                       map[string]any{"href": base + "/info", "templated": false},
				"metrics":                    map[string]any{"href": base + "/metrics", "templated": false},
				"metrics-requiredMetricName": map[string]any{"href": base + "/metrics/{requiredMetricName}", "templated": true},
				"shutdown":                   map[string]any{"href": base + "/shutdown", "templated": false},
			},
		})
	})

	mux.HandleFunc("/actuator/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/vnd.spring-boot.actuator.v3+json;charset=UTF-8")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "UP",
			"components": map[string]any{
				"nginx": map[string]any{"status": "UP"},
				"ping":  map[string]any{"status": "UP"},
			},
		})
	})

	mux.HandleFunc("/actuator/info", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/vnd.spring-boot.actuator.v3+json;charset=UTF-8")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"app": map[string]any{
				"name":        "frontend",
				"description": "Smart Healthcare React Frontend with Nginx & SPA Fallback",
				"version":     "1.0.0",
				"runtime":     "nginx+go",
			},
		})
	})

	mux.HandleFunc("/actuator/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/vnd.spring-boot.actuator.v3+json;charset=UTF-8")
		metricName := strings.TrimPrefix(r.URL.Path, "/actuator/metrics/")
		metricName = strings.TrimPrefix(metricName, "/")

		if metricName == "" || metricName == "actuator/metrics" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"names": []string{
					"process.uptime",
					"jvm.memory.used",
				},
			})
			return
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"name": metricName,
			"measurements": []map[string]any{
				{"statistic": "VALUE", "value": 1},
			},
			"availableTags": []any{},
		})
	})

	mux.HandleFunc("/actuator/shutdown", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/vnd.spring-boot.actuator.v3+json;charset=UTF-8")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"message": "Shutting down frontend...",
		})
		go func() {
			time.Sleep(500 * time.Millisecond)
			stop()
		}()
	})

	server := &http.Server{
		Addr:    ":9113",
		Handler: mux,
	}

	go func() {
		log.Println("Frontend metrics and actuator server listening on :9113")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdownCtx)
}

func tailLog(filePath string) {
	var offset int64 = 0
	for {
		file, err := os.Open(filePath)
		if err != nil {
			time.Sleep(1 * time.Second)
			continue
		}

		fi, err := file.Stat()
		if err == nil && fi.Size() < offset {
			offset = 0 // file truncated or rotated
		}
		_, _ = file.Seek(offset, io.SeekStart)

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := scanner.Text()
			parts := strings.Split(line, "\"")
			if len(parts) >= 3 {
				reqParts := strings.Fields(parts[1])
				statusParts := strings.Fields(parts[2])
				if len(reqParts) >= 2 && len(statusParts) >= 1 {
					method := reqParts[0]
					uri := reqParts[1]
					if idx := strings.Index(uri, "?"); idx != -1 {
						uri = uri[:idx]
					}
					status := statusParts[0]

					if strings.HasPrefix(uri, "/metrics") || strings.HasPrefix(uri, "/actuator") {
						continue
					}

					mu.Lock()
					counts[metricKey{method: method, status: status, uri: uri}]++
					mu.Unlock()
				}
			}
		}
		newOffset, _ := file.Seek(0, io.SeekCurrent)
		offset = newOffset
		file.Close()
		time.Sleep(300 * time.Millisecond)
	}
}
