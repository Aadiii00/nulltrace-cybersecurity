import os
import subprocess
import sys

def build_executable():
    print("[Sentinel Build] Compiling NullTraceSentinel.exe using PyInstaller...")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    main_py = os.path.join(current_dir, "main.py")
    dist_dir = os.path.join(current_dir, "dist")
    
    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--uac-admin",
        "--name", "NullTraceSentinel",
        "--distpath", dist_dir,
        "--workpath", os.path.join(current_dir, "build"),
        "--collect-all", "customtkinter",
        main_py
    ]
    
    res = subprocess.run(cmd)
    if res.returncode == 0:
        exe_location = os.path.join(dist_dir, "NullTraceSentinel.exe")
        print(f"\n[Sentinel Build] SUCCESS: Built standalone NullTraceSentinel.exe successfully!")
        print(f"[Sentinel Build] Location: {exe_location}\n")
    else:
        print("\n❌ PyInstaller compilation failed.")

if __name__ == "__main__":
    build_executable()
