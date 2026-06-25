from dotenv import load_dotenv

load_dotenv(override=True)

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Disable reloader — it spawns a second process that locks SQLite on Windows.
    app.run(host="0.0.0.0", port=5050, debug=True, use_reloader=False)
