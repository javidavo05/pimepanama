from playwright.sync_api import sync_playwright
import pathlib

html_path = pathlib.Path("/home/claude/proposal/index.html").resolve()
out_path = "/home/claude/proposal/Propuesta_Directorio_Adventista_Pime.pdf"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(f"file://{html_path}")
    page.wait_for_timeout(400)
    page.pdf(
        path=out_path,
        width="210mm",
        height="297mm",
        print_background=True,
        margin={"top":"0mm","bottom":"0mm","left":"0mm","right":"0mm"},
    )
    browser.close()
print("done")
