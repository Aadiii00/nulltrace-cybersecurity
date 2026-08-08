import sys
import os

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gui import SentinelApp

if __name__ == "__main__":
    initial_f = sys.argv[2] if len(sys.argv) >= 3 and sys.argv[1] == "--scan" else ""
    app = SentinelApp(initial_scan_file=initial_f)
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
