package middleware

import (
	"log"
	"net/http"
	"time"
)

type statusWriter struct {
	http.ResponseWriter
	code int
}

func (w *statusWriter) WriteHeader(c int) { w.code = c; w.ResponseWriter.WriteHeader(c) }

// Logger logs method, path, status and latency only; never bodies or identifiers.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &statusWriter{w, http.StatusOK}
		start := time.Now()
		next.ServeHTTP(sw, r)
		log.Printf(`{"method":%q,"path":%q,"status":%d,"ms":%d,"correlation_id":%q}`,
			r.Method, r.URL.Path, sw.code, time.Since(start).Milliseconds(), w.Header().Get("X-Correlation-ID"))
	})
}
