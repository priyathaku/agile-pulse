import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.worker.runner import Worker

if __name__ == "__main__":
    print("Starting Agile Management Background Queue Worker...")
    worker = Worker()
    worker.run()
