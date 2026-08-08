import sys
import os
import winreg

def add_context_menu():
    """Adds 'Scan with NullTrace' to the Windows Context Menu for all files without requiring Admin rights."""
    try:
        exe_path = sys.executable if getattr(sys, 'frozen', False) else f'"{sys.executable}" "{os.path.abspath(os.path.join(os.path.dirname(__file__), "main.py"))}"'
        
        # Write to HKEY_CURRENT_USER (No Admin privileges required)
        key_path = r"Software\Classes\*\shell\NullTraceSentinel"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValue(key, "", winreg.REG_SZ, "Scan with NullTrace Sentinel")
            winreg.SetValueEx(key, "Icon", 0, winreg.REG_SZ, sys.executable)
            
            with winreg.CreateKey(key, "command") as cmd_key:
                command = f'"{sys.executable}" --scan "%1"' if getattr(sys, 'frozen', False) else f'{exe_path} --scan "%1"'
                winreg.SetValue(cmd_key, "", winreg.REG_SZ, command)
                
        return True, "Windows Shell Context Menu ('Scan with NullTrace Sentinel') registered successfully!"
    except Exception as e:
        # Fallback attempt on HKCR if needed
        try:
            key_path = r"*\shell\NullTraceSentinel"
            with winreg.CreateKey(winreg.HKEY_CLASSES_ROOT, key_path) as key:
                winreg.SetValue(key, "", winreg.REG_SZ, "Scan with NullTrace Sentinel")
                with winreg.CreateKey(key, "command") as cmd_key:
                    winreg.SetValue(cmd_key, "", winreg.REG_SZ, f'"{sys.executable}" --scan "%1"')
            return True, "Windows Shell Context Menu registered successfully."
        except Exception as ex:
            return False, f"Failed to register context menu: {str(ex)}"

def remove_context_menu():
    """Removes 'Scan with NullTrace' from the Windows Context Menu."""
    try:
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\*\shell\NullTraceSentinel\command")
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\*\shell\NullTraceSentinel")
        except Exception:
            pass
        try:
            winreg.DeleteKey(winreg.HKEY_CLASSES_ROOT, r"*\shell\NullTraceSentinel\command")
            winreg.DeleteKey(winreg.HKEY_CLASSES_ROOT, r"*\shell\NullTraceSentinel")
        except Exception:
            pass
        return True, "Context menu unregistered successfully."
    except Exception as e:
        return False, str(e)
