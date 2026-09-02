"""
Tiny local demo server for the deterministic lab-report parsers.
Mirrors the real flow: browser drops a PDF -> POST bytes to /parse ->
Python backend routes to the matching parser (no LLM) -> JSON back to the page.

Run:  ./venv/bin/python server.py   (then open the printed URL)
"""
import json, tempfile, os, traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote
import parsers

PORT = 8770
HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = "/Users/tobias/Downloads/sample-reports"  # for the ?demo= self-test only


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")
        elif self.path.startswith("/samples/"):
            name = os.path.basename(unquote(self.path[len("/samples/"):]))
            p = os.path.join(SAMPLES, name)
            if os.path.isfile(p):
                with open(p, "rb") as f:
                    self._send(200, f.read(), "application/pdf")
            else:
                self._send(404, json.dumps({"error": "no such sample"}))
        else:
            self._send(404, json.dumps({"error": "not found"}))

    def do_POST(self):
        if self.path != "/parse":
            self._send(404, json.dumps({"error": "not found"}))
            return
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        try:
            tmp.write(raw); tmp.close()
            result = parsers.route(tmp.name)
            self._send(200, json.dumps(result, ensure_ascii=False))
        except Exception as e:
            self._send(200, json.dumps({
                "error": str(e), "trace": traceback.format_exc()}))
        finally:
            os.unlink(tmp.name)

    def log_message(self, *a):
        pass  # quiet


if __name__ == "__main__":
    print(f"\n  Aqua parser demo running →  http://localhost:{PORT}\n")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
