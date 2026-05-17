from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Alexa Forge"
    database_url: str = "sqlite:///./dev.db"
    vault_secret: str = "dev-only-change-me"

settings = Settings()
