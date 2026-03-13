package main

import (
	"fmt"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello, Docker Go!")
}

func main() {
	http.HandleFunc("/", handler)
	fmt.Println("Go app is running on port 8080")
	http.ListenAndServe(":8080", nil)
}
