# ==============================================================================
# Project: Hangman Game Web Server
# Description: Lightweight local Python HTTP server to host and preview the
#              Hangman web frontend.
# Usage: python server.py
# ==============================================================================

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching-friendly headers and CORS for local testing
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    # Ensure working directory is the project folder containing index.html
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    # Allow socket address reuse to prevent "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("=" * 60)
            print("        HANGMAN WEB FRONTEND SERVER RUNNING")
            print("=" * 60)
            print(f">> Serving files from: {project_dir}")
            print(f">> Open in your browser: {url}")
            print(">> Press Ctrl+C in this terminal to stop the server.")
            print("=" * 60)

            # Automatically launch the web page in the default browser
            webbrowser.open(url)

            # Start serving requests indefinitely
            httpd.serve_forever()

    except OSError as err:
        print(f"\n[Error] Port {PORT} might already be in use: {err}")
        print("You can also open 'index.html' directly in your web browser!")
    except KeyboardInterrupt:
        print("\n[Server Stopped] Thank you for playing Hangman!")
        sys.exit(0)

if __name__ == "__main__":
    run_server()
