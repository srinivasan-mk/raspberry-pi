from abc import ABC, abstractmethod
from typing import Dict, Any
from playwright.async_api import Page

class BaseSiteScraper(ABC):
    """Abstract base class for all site-specific scrapers and navigators."""

    @abstractmethod
    async def execute(self, page: Page, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the scraping flow.
        :param page: Active Playwright Page instance.
        :param payload: Parameters passed from the CommandEnvelope.
        :return: Extracted data dictionary.
        """
        pass
