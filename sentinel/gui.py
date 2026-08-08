import os
import sys
import webbrowser
import threading
import time
import tkinter as tk
from tkinter import filedialog, messagebox
import customtkinter as ctk
from sentinel_agent import SentinelAgent
from registry import add_context_menu, remove_context_menu

# Enterprise Cyber EDR Appearance
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class SentinelApp(ctk.CTk):
    def __init__(self, initial_scan_file: str = ""):
        super().__init__()

        self.title("NullTrace Sentinel — Enterprise Endpoint Protection & EDR Agent")
        self.geometry("1080x760")
        self.minsize(1000, 700)
        self.configure(fg_color="#050811")  # Deep Midnight Cyber Obsidian

        # Agent Engine Initialization
        self.agent = SentinelAgent(alert_callback=self.on_alert_received)
        self.agent.start()

        # UI Components Setup
        self.setup_header()
        self.setup_main_grid()
        self.setup_bottom_bar()

        # Telemetry UI update loop (Every 2 seconds)
        self.after(2000, self.update_telemetry_ui)

        if initial_scan_file and os.path.exists(initial_scan_file):
            threading.Thread(target=self.agent.analyze_and_report_file, args=(initial_scan_file, "Context Menu Scan"), daemon=True).start()

    # ── 1. Top Cyber EDR Header ──────────────────────────────────────────────
    def setup_header(self):
        header_frame = ctk.CTkFrame(self, fg_color="#0d111d", corner_radius=14, border_width=1, border_color="#1e293b")
        header_frame.pack(fill="x", padx=20, pady=(16, 10))

        # Title & Subtitle
        title_box = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_box.pack(side="left", padx=20, pady=14)

        title_lbl = ctk.CTkLabel(
            title_box, 
            text="🛡️ NULLTRACE SENTINEL EDR", 
            font=ctk.CTkFont(family="Inter", size=22, weight="bold"), 
            text_color="#38bdf8"
        )
        title_lbl.pack(anchor="w")

        sub_lbl = ctk.CTkLabel(
            title_box, 
            text="Real-Time Endpoint Detection & Response • AI Malware Engine • System Risk Auditor", 
            font=ctk.CTkFont(size=11), 
            text_color="#64748b"
        )
        sub_lbl.pack(anchor="w", pady=(2, 0))

        # Protection Status Badge
        status_box = ctk.CTkFrame(header_frame, fg_color="#064e3b", corner_radius=20, border_width=1, border_color="#10b981")
        status_box.pack(side="right", padx=20, pady=14)

        self.status_lbl = ctk.CTkLabel(
            status_box, 
            text="  ● REAL-TIME PROTECTION ACTIVE  ", 
            font=ctk.CTkFont(size=12, weight="bold"), 
            text_color="#34d399"
        )
        self.status_lbl.pack(padx=14, pady=6)

    # ── 2. Main Dual Panel Grid ─────────────────────────────────────────────
    def setup_main_grid(self):
        main_grid = ctk.CTkFrame(self, fg_color="transparent")
        main_grid.pack(fill="both", expand=True, padx=20, pady=6)

        # Left Telemetry Panel (Width 360)
        left_panel = ctk.CTkFrame(main_grid, fg_color="#0d111d", corner_radius=14, border_width=1, border_color="#1e293b", width=360)
        left_panel.pack(side="left", fill="y", padx=(0, 10))
        left_panel.pack_propagate(False)

        sys_info = self.agent.get_system_info()

        lbl_sys = ctk.CTkLabel(left_panel, text="💻 ENDPOINT TELEMETRY", font=ctk.CTkFont(size=13, weight="bold"), text_color="#38bdf8")
        lbl_sys.pack(anchor="w", padx=18, pady=(16, 8))

        # Specs Rows
        specs = [
            ("Device Hostname", sys_info["hostname"]),
            ("Windows OS", sys_info["osVersion"][:26]),
            ("User Session", sys_info["username"]),
            ("Private IP", sys_info["privateIp"]),
            ("MAC Address", sys_info["macAddress"]),
            ("Total RAM", f"{sys_info['totalRamGb']} GB")
        ]

        for title, val in specs:
            row = ctk.CTkFrame(left_panel, fg_color="#141c2e", corner_radius=8)
            row.pack(fill="x", padx=14, pady=3)
            ctk.CTkLabel(row, text=title, font=ctk.CTkFont(size=11), text_color="#94a3b8").pack(side="left", padx=10, pady=5)
            ctk.CTkLabel(row, text=val, font=ctk.CTkFont(size=11, weight="bold"), text_color="#f8fafc").pack(side="right", padx=10, pady=5)

        # Live Resource Meters
        lbl_meters = ctk.CTkLabel(left_panel, text="📊 LIVE SYSTEM METRICS", font=ctk.CTkFont(size=12, weight="bold"), text_color="#38bdf8")
        lbl_meters.pack(anchor="w", padx=18, pady=(12, 4))

        self.cpu_meter_lbl = ctk.CTkLabel(left_panel, text="CPU Usage: 0%", font=ctk.CTkFont(size=11), text_color="#cbd5e1")
        self.cpu_meter_lbl.pack(anchor="w", padx=18, pady=(2, 0))
        self.cpu_progress = ctk.CTkProgressBar(left_panel, height=8, progress_color="#06b6d4", fg_color="#1e293b")
        self.cpu_progress.pack(fill="x", padx=18, pady=(2, 8))
        self.cpu_progress.set(0.15)

        self.ram_meter_lbl = ctk.CTkLabel(left_panel, text="RAM Usage: 0%", font=ctk.CTkFont(size=11), text_color="#cbd5e1")
        self.ram_meter_lbl.pack(anchor="w", padx=18, pady=(2, 0))
        self.ram_progress = ctk.CTkProgressBar(left_panel, height=8, progress_color="#a855f7", fg_color="#1e293b")
        self.ram_progress.pack(fill="x", padx=18, pady=(2, 12))
        self.ram_progress.set(0.40)

        # Stat Summary Cards Grid (Fixed fit)
        stat_frame = ctk.CTkFrame(left_panel, fg_color="transparent")
        stat_frame.pack(fill="x", padx=14, pady=(0, 10))

        self.downloads_count_lbl = self._create_stat_card(stat_frame, "Downloads", "0", "#0284c7")
        self.threats_count_lbl = self._create_stat_card(stat_frame, "Threats", "0", "#ef4444")
        self.usb_count_lbl = self._create_stat_card(stat_frame, "USB / Devices", "0", "#10b981")

        # Right Alerts Panel
        right_panel = ctk.CTkFrame(main_grid, fg_color="#0d111d", corner_radius=14, border_width=1, border_color="#1e293b")
        right_panel.pack(side="right", fill="both", expand=True)

        top_alerts_bar = ctk.CTkFrame(right_panel, fg_color="transparent")
        top_alerts_bar.pack(fill="x", padx=18, pady=(16, 8))

        lbl_alerts = ctk.CTkLabel(top_alerts_bar, text="🚨 REAL-TIME THREAT INSPECTIONS", font=ctk.CTkFont(size=13, weight="bold"), text_color="#f43f5e")
        lbl_alerts.pack(side="left")

        live_badge = ctk.CTkFrame(top_alerts_bar, fg_color="#0284c7", corner_radius=6)
        live_badge.pack(side="right")
        ctk.CTkLabel(live_badge, text=" LIVE FEED ", font=ctk.CTkFont(size=10, weight="bold"), text_color="#ffffff").pack(padx=6, pady=2)

        self.alerts_scroll = ctk.CTkScrollableFrame(right_panel, fg_color="transparent")
        self.alerts_scroll.pack(fill="both", expand=True, padx=14, pady=(0, 14))

        self.empty_lbl = ctk.CTkLabel(
            self.alerts_scroll, 
            text="🛡️ No active threats detected. Endpoint real-time protection is active.", 
            font=ctk.CTkFont(size=12), 
            text_color="#64748b"
        )
        self.empty_lbl.pack(pady=60)

    def _create_stat_card(self, parent, title, val, color):
        card = ctk.CTkFrame(parent, fg_color="#141c2e", corner_radius=10)
        card.pack(side="left", fill="both", expand=True, padx=3)
        ctk.CTkLabel(card, text=title, font=ctk.CTkFont(size=10), text_color="#94a3b8").pack(pady=(6, 0))
        val_lbl = ctk.CTkLabel(card, text=val, font=ctk.CTkFont(size=15, weight="bold"), text_color=color)
        val_lbl.pack(pady=(0, 6))
        return val_lbl

    # ── 3. Bottom Controls Bar ──────────────────────────────────────────────
    def setup_bottom_bar(self):
        bottom_bar = ctk.CTkFrame(self, fg_color="#0d111d", corner_radius=14, border_width=1, border_color="#1e293b")
        bottom_bar.pack(fill="x", padx=20, pady=(6, 16))

        # Action Buttons Grid
        btn_clear = ctk.CTkButton(bottom_bar, text="🧹 Clear Alerts", fg_color="#374151", hover_color="#4b5563", font=ctk.CTkFont(size=12, weight="bold"), command=self.on_clear_alerts)
        btn_clear.pack(side="right", padx=4, pady=12)

        btn_ctx = ctk.CTkButton(bottom_bar, text="⚙️ Context Menu", fg_color="#1e293b", hover_color="#334155", font=ctk.CTkFont(size=12, weight="bold"), command=self.on_register_context_menu)
        btn_ctx.pack(side="right", padx=4, pady=12)

        self.btn_isolate = ctk.CTkButton(bottom_bar, text="🚨 Isolate Endpoint", fg_color="#dc2626", hover_color="#b91c1c", font=ctk.CTkFont(size=12, weight="bold"), command=self.on_toggle_isolation)
        self.btn_isolate.pack(side="right", padx=4, pady=12)

        btn_ransomware = ctk.CTkButton(bottom_bar, text="💥 Test Ransomware Attack", fg_color="#b91c1c", hover_color="#991b1b", font=ctk.CTkFont(size=12, weight="bold"), command=self.on_test_ransomware_attack)
        btn_ransomware.pack(side="right", padx=4, pady=12)

        btn_audit = ctk.CTkButton(bottom_bar, text="🛡️ Audit Windows Risk", fg_color="#f59e0b", text_color="#000000", hover_color="#d97706", font=ctk.CTkFont(size=12, weight="bold"), command=self.on_audit_windows_risk)
        btn_audit.pack(side="right", padx=4, pady=12)

        btn_folder = ctk.CTkButton(bottom_bar, text="📁 Scan Drive / Folder", fg_color="#8b5cf6", hover_color="#7c3aed", font=ctk.CTkFont(size=12, weight="bold"), command=self.on_scan_folder_dialog)
        btn_folder.pack(side="right", padx=4, pady=12)

        btn_scan = ctk.CTkButton(bottom_bar, text="🔍 Scan File", fg_color="#06b6d4", text_color="#000000", hover_color="#0891b2", font=ctk.CTkFont(size=12, weight="bold"), command=self.on_scan_file_dialog)
        btn_scan.pack(side="right", padx=4, pady=12)

        btn_web = ctk.CTkButton(bottom_bar, text="🌐 SOC Web Portal", fg_color="#1f2937", hover_color="#374151", font=ctk.CTkFont(size=12, weight="bold"), command=self.open_web_portal)
        btn_web.pack(side="right", padx=4, pady=12)

    # ── 4. UI Callbacks & Updates ───────────────────────────────────────────
    def update_telemetry_ui(self):
        import psutil
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent

        self.cpu_meter_lbl.configure(text=f"CPU Usage: {cpu}%")
        self.cpu_progress.set(cpu / 100.0)

        self.ram_meter_lbl.configure(text=f"RAM Usage: {ram}%")
        self.ram_progress.set(ram / 100.0)

        self.downloads_count_lbl.configure(text=str(self.agent.scanned_downloads_count))
        self.threats_count_lbl.configure(text=str(self.agent.active_threats_count))
        self.usb_count_lbl.configure(text=str(self.agent.usb_events_count))

        self.after(2000, self.update_telemetry_ui)

    def on_alert_received(self, alert: dict):
        if hasattr(self, 'empty_lbl') and self.empty_lbl.winfo_exists():
            self.empty_lbl.destroy()

        is_malicious = alert.get("riskScore", 0) >= 60
        card_border = "#ef4444" if is_malicious else "#10b981"
        card = ctk.CTkFrame(self.alerts_scroll, fg_color="#141c2e", corner_radius=12, border_width=1, border_color=card_border)
        card.pack(fill="x", pady=5, padx=2)

        top_row = ctk.CTkFrame(card, fg_color="transparent")
        top_row.pack(fill="x", padx=12, pady=(10, 4))

        icon_title = f"⚠️ THREAT: {alert['filename']}" if is_malicious else f"✅ SAFE: {alert['filename']}"
        title_color = "#f43f5e" if is_malicious else "#34d399"
        ctk.CTkLabel(top_row, text=icon_title, font=ctk.CTkFont(size=13, weight="bold"), text_color=title_color).pack(side="left")
        
        risk_color = "#ef4444" if alert["riskScore"] >= 70 else ("#f59e0b" if alert["riskScore"] >= 40 else "#10b981")
        badge_text = f" Risk: {alert['riskScore']}% (MALICIOUS) " if is_malicious else f" Risk: {alert['riskScore']}% (SAFE) "
        badge = ctk.CTkFrame(top_row, fg_color=risk_color, corner_radius=6)
        badge.pack(side="right")
        ctk.CTkLabel(badge, text=badge_text, font=ctk.CTkFont(size=10, weight="bold"), text_color="#ffffff").pack(padx=6, pady=2)

        summary_lbl = ctk.CTkLabel(card, text=alert["aiSummary"], font=ctk.CTkFont(size=11), text_color="#94a3b8", justify="left", wraplength=540)
        summary_lbl.pack(anchor="w", padx=12, pady=(0, 6))

        btn_row = ctk.CTkFrame(card, fg_color="transparent")
        btn_row.pack(fill="x", padx=12, pady=(0, 10))

        file_p = alert.get("evidenceDetails", {}).get("filePath", "")
        if file_p and is_malicious:
            def _delete_target(path=file_p, card_widget=card):
                if messagebox.askyesno("Delete Malicious File", f"Are you sure you want to permanently delete or quarantine:\n{path}?"):
                    ok, msg = self.agent.delete_file_safely(path)
                    if ok:
                        messagebox.showinfo("NullTrace Sentinel", msg)
                        card_widget.destroy()
                    else:
                        messagebox.showerror("NullTrace Sentinel", msg)

            ctk.CTkButton(btn_row, text="🗑️ Delete Threat", height=26, font=ctk.CTkFont(size=11, weight="bold"), fg_color="#dc2626", hover_color="#b91c1c", command=_delete_target).pack(side="left")

        if is_malicious:
            ctk.CTkButton(btn_row, text="Investigate in SOC", height=26, font=ctk.CTkFont(size=11, weight="bold"), fg_color="#ef4444", hover_color="#dc2626", command=lambda: self.open_web_portal("/soc-workbench")).pack(side="right", padx=4)
        ctk.CTkButton(btn_row, text="View Report", height=26, font=ctk.CTkFont(size=11), fg_color="#374151", hover_color="#4b5563", command=lambda: self.open_web_portal("/endpoints")).pack(side="right")

    def on_register_context_menu(self):
        success, msg = add_context_menu()
        if success:
            messagebox.showinfo("NullTrace Sentinel", msg)
        else:
            messagebox.showwarning("NullTrace Sentinel", msg)

    def on_toggle_isolation(self):
        if getattr(self.agent, 'is_network_isolated', False):
            if messagebox.askyesno("Restore Network Connection", "Are you sure you want to restore full network connectivity for this endpoint?"):
                ok, msg = self.agent.unisolate_network()
                messagebox.showinfo("NullTrace Network Guard", msg)
                self.btn_isolate.configure(text="🚨 Isolate Endpoint", fg_color="#dc2626", hover_color="#b91c1c")
                self.status_lbl.configure(text="  ● REAL-TIME PROTECTION ACTIVE  ", text_color="#34d399")
        else:
            if messagebox.askyesno("🚨 EMERGENCY NETWORK ISOLATION", "WARNING: Isolating this host will block all inbound and outbound network traffic to prevent cyber outbreak spread.\n\nProceed with host isolation?"):
                ok, msg = self.agent.isolate_network()
                messagebox.showwarning("NullTrace Network Guard", msg)
                self.btn_isolate.configure(text="🔓 Restore Network", fg_color="#059669", hover_color="#047857")
                self.status_lbl.configure(text="  ● ENDPOINT ISOLATED  ", text_color="#ef4444")

    def on_test_ransomware_attack(self):
        messagebox.showinfo(
            "NullTrace — Ransomware Shield Attack Simulator",
            "Initiating simulated Ransomware Encryption Attack on Decoy Canary Vault...\n\n"
            "Sentinel will catch the encryption attempt, terminate the attacker process PID, and trigger a 100% Risk Alert!"
        )
        def _sim_attack():
            user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
            docs_canary = os.path.join(user_profile, "Documents", ".nulltrace_canary_financial_vault.docx")
            
            try:
                # Append to canary vault file to trigger filesystem watcher
                with open(docs_canary, "a") as f:
                    f.write("\n[SIMULATED_RANSOMWARE_ENCRYPTION_ATTEMPT_LOCKED]")
            except Exception:
                pass

        threading.Thread(target=_sim_attack, daemon=True).start()

    def on_scan_file_dialog(self):
        fp = filedialog.askopenfilename(title="Select Executable or File for NullTrace Analysis")
        if fp:
            messagebox.showinfo("NullTrace Sentinel", f"Initiating deep inspection for '{os.path.basename(fp)}'...")
            threading.Thread(target=self.agent.analyze_and_report_file, args=(fp, "Manual Sentinel Scan"), daemon=True).start()

    def on_scan_folder_dialog(self):
        folder = filedialog.askdirectory(title="Select Folder or Drive to Antivirus Scan")
        if not folder:
            return
        self.run_antivirus_folder_scan(folder)

    def on_audit_windows_risk(self):
        audits = self.agent.audit_windows_security_risks()
        
        dialog = ctk.CTkToplevel(self)
        dialog.title("NullTrace — Windows OS Security & Threat Audit")
        dialog.geometry("680x480")
        dialog.configure(fg_color="#050811")
        dialog.grab_set()

        ctk.CTkLabel(dialog, text="🛡️ WINDOWS OS RISK & THREAT AUDIT", font=ctk.CTkFont(size=16, weight="bold"), text_color="#f59e0b").pack(pady=(20, 5))
        ctk.CTkLabel(dialog, text="Real-time inspection of Firewall, UAC, Defender, Registry, and Network Ports", font=ctk.CTkFont(size=11), text_color="#94a3b8").pack(pady=(0, 10))

        scroll = ctk.CTkScrollableFrame(dialog, fg_color="transparent")
        scroll.pack(fill="both", expand=True, padx=20, pady=10)

        vulnerable_count = 0
        for item in audits:
            is_vuln = item["status"] == "VULNERABLE"
            if is_vuln:
                vulnerable_count += 1

            border = "#ef4444" if is_vuln else "#10b981"
            card = ctk.CTkFrame(scroll, fg_color="#0d111d", corner_radius=10, border_width=1, border_color=border)
            card.pack(fill="x", pady=5, padx=2)

            top = ctk.CTkFrame(card, fg_color="transparent")
            top.pack(fill="x", padx=12, pady=(10, 4))

            ic = "⚠️" if is_vuln else "✅"
            title_clr = "#f43f5e" if is_vuln else "#34d399"
            ctk.CTkLabel(top, text=f"{ic} {item['title']}", font=ctk.CTkFont(size=13, weight="bold"), text_color=title_clr).pack(side="left")

            badge_bg = "#ef4444" if item["severity"] in ["CRITICAL", "HIGH"] else "#10b981"
            badge = ctk.CTkFrame(top, fg_color=badge_bg, corner_radius=6)
            badge.pack(side="right")
            ctk.CTkLabel(badge, text=f" {item['severity']} ", font=ctk.CTkFont(size=10, weight="bold"), text_color="#ffffff").pack(padx=6, pady=1)

            ctk.CTkLabel(card, text=item["description"], font=ctk.CTkFont(size=11), text_color="#cbd5e1", justify="left", wraplength=600).pack(anchor="w", padx=12, pady=(0, 10))

        if vulnerable_count == 0:
            messagebox.showinfo("NullTrace OS Audit", "✅ Windows Security Posture Verified Secure!\nFirewall, UAC, Defender, and Registry auto-start keys are fully protected.")

    def run_antivirus_folder_scan(self, folder_path: str):
        if not os.path.exists(folder_path):
            messagebox.showerror("NullTrace Sentinel", f"Path does not exist:\n{folder_path}")
            return

        dialog = ctk.CTkToplevel(self)
        dialog.title("NullTrace — Drive & Folder Antivirus Scanner")
        dialog.geometry("580x280")
        dialog.configure(fg_color="#050811")
        dialog.grab_set()

        ctk.CTkLabel(dialog, text="🛡️ FULL DRIVE & FOLDER ANTIVIRUS SCANNER", font=ctk.CTkFont(size=15, weight="bold"), text_color="#a855f7").pack(pady=(20, 5))
        lbl_status = ctk.CTkLabel(dialog, text=f"Target Path: {folder_path}", font=ctk.CTkFont(size=11), text_color="#94a3b8")
        lbl_status.pack(pady=4)

        pbar = ctk.CTkProgressBar(dialog, width=500, height=12, progress_color="#10b981")
        pbar.pack(pady=15)
        pbar.set(0)

        lbl_info = ctk.CTkLabel(dialog, text="Analyzing files with YARA signatures & MalConv2 AI...", font=ctk.CTkFont(size=11), text_color="#cbd5e1")
        lbl_info.pack(pady=5)

        def _run_scan():
            def _cb(cur, tot, fname, res):
                pbar.set(cur / float(tot) if tot else 1.0)
                lbl_info.configure(text=f"[{cur}/{tot}] Scanning: {fname}")

            self.agent.scan_directory(folder_path, progress_cb=_cb)
            lbl_info.configure(text="✅ Antivirus Scan Completed!")
            messagebox.showinfo("NullTrace Sentinel", f"Completed full antivirus scan for:\n{folder_path}")
            dialog.destroy()

        threading.Thread(target=_run_scan, daemon=True).start()

    def on_clear_alerts(self):
        self.agent.alerts_history.clear()
        for child in self.alerts_scroll.winfo_children():
            child.destroy()
        self.empty_lbl = ctk.CTkLabel(self.alerts_scroll, text="🛡️ No active threats detected. Endpoint protection is active.", font=ctk.CTkFont(size=12), text_color="#64748b")
        self.empty_lbl.pack(pady=60)

    def open_web_portal(self, path: str = "/endpoints"):
        webbrowser.open(f"http://localhost:3000{path}")

    def on_closing(self):
        self.agent.stop()
        self.destroy()

if __name__ == "__main__":
    initial_f = sys.argv[2] if len(sys.argv) >= 3 and sys.argv[1] == "--scan" else ""
    app = SentinelApp(initial_scan_file=initial_f)
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
