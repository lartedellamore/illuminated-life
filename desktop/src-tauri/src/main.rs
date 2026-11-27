// Illuminated Life as a desktop program: the web app, in its own window.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Illuminated Life");
}
