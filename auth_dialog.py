import tkinter as tk
from tkinter import ttk
import hashlib


class AuthDialog:
    """
    Reusable authentication dialog.
    Usage:
        dialog = AuthDialog(parent, password_hash=hash_password("secret"), action="delete this file")
        if dialog.confirmed:
            ...
    """

    def __init__(self, parent, password_hash: str, action: str = "perform this action"):
        self.confirmed = False

        self.win = tk.Toplevel(parent)
        self.win.title("Authorization Required")
        self.win.resizable(False, False)
        self.win.grab_set()  # modal
        self.win.focus_force()

        self._build_ui(action)
        self._center(parent)

        self.password_hash = password_hash
        self.win.wait_window()

    def _build_ui(self, action: str):
        ICON_COLOR = "#0078D4"
        BG = "#F3F3F3"
        self.win.configure(bg=BG)

        # Header bar
        header = tk.Frame(self.win, bg=ICON_COLOR, height=6)
        header.pack(fill="x")

        # Body
        body = tk.Frame(self.win, bg=BG, padx=24, pady=20)
        body.pack(fill="both", expand=True)

        # Icon + title row
        icon_frame = tk.Frame(body, bg=BG)
        icon_frame.pack(anchor="w", pady=(0, 12))

        icon_label = tk.Label(icon_frame, text="🔒", font=("Segoe UI", 28), bg=BG)
        icon_label.pack(side="left", padx=(0, 12))

        title_frame = tk.Frame(icon_frame, bg=BG)
        title_frame.pack(side="left")

        tk.Label(title_frame, text="Authorization Required",
                 font=("Segoe UI", 12, "bold"), bg=BG).pack(anchor="w")
        tk.Label(title_frame, text=f"To: {action}",
                 font=("Segoe UI", 9), fg="#555", bg=BG, wraplength=280, justify="left").pack(anchor="w")

        ttk.Separator(body, orient="horizontal").pack(fill="x", pady=10)

        # Password field
        tk.Label(body, text="Enter your password to continue:",
                 font=("Segoe UI", 9), bg=BG).pack(anchor="w")

        self.pw_var = tk.StringVar()
        self.pw_entry = tk.Entry(body, textvariable=self.pw_var, show="•",
                                  font=("Segoe UI", 10), width=32)
        self.pw_entry.pack(pady=(4, 0), anchor="w")
        self.pw_entry.focus()

        self.error_label = tk.Label(body, text="", fg="#C42B1C",
                                     font=("Segoe UI", 9), bg=BG)
        self.error_label.pack(anchor="w", pady=(2, 0))

        # Buttons
        btn_frame = tk.Frame(body, bg=BG)
        btn_frame.pack(anchor="e", pady=(12, 0))

        cancel_btn = tk.Button(btn_frame, text="Cancel", width=10,
                               font=("Segoe UI", 9),
                               command=self.win.destroy)
        cancel_btn.pack(side="left", padx=(0, 8))

        ok_btn = tk.Button(btn_frame, text="Confirm", width=10,
                           font=("Segoe UI", 9, "bold"),
                           bg=ICON_COLOR, fg="white", relief="flat",
                           activebackground="#005A9E", activeforeground="white",
                           command=self._on_confirm)
        ok_btn.pack(side="left")

        self.win.bind("<Return>", lambda _: self._on_confirm())
        self.win.bind("<Escape>", lambda _: self.win.destroy())

    def _on_confirm(self):
        entered = hash_password(self.pw_var.get())
        if entered == self.password_hash:
            self.confirmed = True
            self.win.destroy()
        else:
            self.error_label.config(text="Incorrect password. Please try again.")
            self.pw_entry.delete(0, "end")
            self.pw_entry.focus()

    def _center(self, parent):
        self.win.update_idletasks()
        pw = parent.winfo_rootx() + parent.winfo_width() // 2
        ph = parent.winfo_rooty() + parent.winfo_height() // 2
        w = self.win.winfo_width()
        h = self.win.winfo_height()
        self.win.geometry(f"+{pw - w // 2}+{ph - h // 2}")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ── Demo ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    STORED_HASH = hash_password("admin123")  # replace with your real hash

    root = tk.Tk()
    root.withdraw()  # hide the main window completely

    dialog = AuthDialog(root, password_hash=STORED_HASH, action="open the application")
    if dialog.confirmed:
        pass  # TODO: add your logic here

    root.destroy()
