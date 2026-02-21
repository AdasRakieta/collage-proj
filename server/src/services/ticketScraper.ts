import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedTicketData {
  fromLocation?: string;
  toLocation?: string;
  departureDate?: string;
  arrivalDate?: string;
  price?: number;
  currency?: string;
  flightNumber?: string;
  carrier?: string;
  success: boolean;
  error?: string;
}

/**
 * Scrape ticket data from various airline and train booking sites
 */
export async function scrapeTicketData(url: string): Promise<ScrapedTicketData> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Detect booking site type
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('booking.com')) {
      return scrapeBookingCom($);
    } else if (hostname.includes('ryanair')) {
      return scrapeRyanair($);
    } else if (hostname.includes('wizzair')) {
      return scrapeWizzair($);
    } else if (hostname.includes('lot.com')) {
      return scrapeLOT($);
    } else if (hostname.includes('pkp') || hostname.includes('intercity')) {
      return scrapePKP($);
    } else if (hostname.includes('google.com/flights')) {
      return scrapeGoogleFlights($);
    } else {
      // Generic scraper - try to find common patterns
      return scrapeGeneric($);
    }

  } catch (error: any) {
    console.error('Scraping error:', error.message);
    return {
      success: false,
      error: `Failed to scrape: ${error.message}`
    };
  }
}

function scrapeBookingCom($: ReturnType<typeof cheerio.load>): ScrapedTicketData {
  // Booking.com structure (for flights)
  const fromLocation = $('[data-testid="origin"]').text().trim() || 
                       $('span:contains("From")').next().text().trim();
  const toLocation = $('[data-testid="destination"]').text().trim() || 
                     $('span:contains("To")').next().text().trim();
  const departureDate = $('[data-testid="departure-date"]').text().trim();
  const price = parseFloat($('[data-testid="price"]').text().replace(/[^\d.]/g, ''));
  
  return {
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    departureDate: departureDate || undefined,
    price: isNaN(price) ? undefined : price,
    currency: 'EUR',
    success: !!(fromLocation && toLocation)
  };
}

function scrapeRyanair($: ReturnType<typeof cheerio.load>): ScrapedTicketData {
  // Ryanair structure
  const fromLocation = $('[data-ref="origin-city"]').text().trim() ||
                       $('.airport-name').first().text().trim();
  const toLocation = $('[data-ref="destination-city"]').text().trim() ||
                     $('.airport-name').last().text().trim();
  const departureDate = $('[data-ref="departure-date"]').text().trim();
  const price = parseFloat($('.price__value').text().replace(/[^\d.]/g, ''));
  
  return {
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    departureDate: departureDate || undefined,
    price: isNaN(price) ? undefined : price,
    currency: 'EUR',
    carrier: 'Ryanair',
    success: !!(fromLocation && toLocation)
  };
}

function scrapeWizzair($: ReturnType<typeof cheerio.load>): ScrapedTicketData {
  const fromLocation = $('[data-test="flight-select-origin"]').text().trim() ||
                       $('.flight-select__origin').text().trim();
  const toLocation = $('[data-test="flight-select-destination"]').text().trim() ||
                     $('.flight-select__destination').text().trim();
  const departureDate = $('[data-test="flight-select-date"]').text().trim();
  const price = parseFloat($('[data-test="flight-price"]').text().replace(/[^\d.]/g, ''));
  
  return {
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    departureDate: departureDate || undefined,
    price: isNaN(price) ? undefined : price,
    currency: 'EUR',
    carrier: 'Wizz Air',
    success: !!(fromLocation && toLocation)
  };
}

function scrapeLOT($: ReturnType<typeof cheerio.load>): ScrapedTicketData {
  const fromLocation = $('[data-test-id="origin"]').text().trim() ||
                       $('.origin-airport').text().trim();
  const toLocation = $('[data-test-id="destination"]').text().trim() ||
                     $('.destination-airport').text().trim();
  const departureDate = $('[data-test-id="departure-date"]').text().trim();
  const price = parseFloat($('.price-amount').text().replace(/[^\d.]/g, ''));
  const flightNumber = $('[data-test-id="flight-number"]').text().trim();
  
  return {
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    departureDate: departureDate || undefined,
    price: isNaN(price) ? undefined : price,
    currency: 'PLN',
    flightNumber: flightNumber || undefined,
    carrier: 'LOT Polish Airlines',
    success: !!(fromLocation && toLocation)
  };
}

function scrapePKP($: ReturnType<typeof cheerio.load>): ScrapedTicketData {
  const fromLocation = $('[name="from"]').val() as string || 
                       $('.station-from').text().trim();
  const toLocation = $('[name="to"]').val() as string || 
                     $('.station-to').text().trim();
  const departureDate = $('[name="date"]').val() as string || 
                        $('.departure-date').text().trim();
  const price = parseFloat($('.price').text().replace(/[^\d.]/g, ''));
  
  return {
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    departureDate: departureDate || undefined,
    price: isNaN(price) ? undefined : price,
    currency: 'PLN',
    carrier: 'PKP Intercity',
    success: !!(fromLocation && toLocation)
  };
}

function scrapeGoogleFlights($: ReturnType<typeof cheerio.load>): ScrapedTicketData {
  // Google Flights uses heavy JavaScript, harder to scrape
  const fromLocation = $('[aria-label*="origin"]').text().trim();
  const toLocation = $('[aria-label*="destination"]').text().trim();
  const departureDate = $('[aria-label*="departure"]').text().trim();
  const price = parseFloat($('.YMlIz').text().replace(/[^\d.]/g, ''));
  
  return {
    fromLocation: fromLocation || undefined,
    toLocation: toLocation || undefined,
    departureDate: departureDate || undefined,
    price: isNaN(price) ? undefined : price,
    success: !!(fromLocation && toLocation)
  };
}

function scrapeGeneric($: ReturnType<typeof cheerio.load>): ScrapedTicketData {
  // Generic patterns - look for common keywords
  const text = $('body').text().toLowerCase();
  const html = $.html();
  
  // Try to find departure/arrival info
  const fromMatch = text.match(/from[:\s]+([a-z\s]+)to/i);
  const toMatch = text.match(/to[:\s]+([a-z\s]+)/i);
  const dateMatch = html.match(/\d{4}-\d{2}-\d{2}/) || 
                    html.match(/\d{2}\/\d{2}\/\d{4}/);
  const priceMatch = html.match(/[\$€£]\s*(\d+[\d.,]*)/);
  
  const fromLocation = fromMatch ? fromMatch[1].trim() : undefined;
  const toLocation = toMatch ? toMatch[1].trim() : undefined;
  const departureDate = dateMatch ? dateMatch[0] : undefined;
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;
  
  return {
    fromLocation,
    toLocation,
    departureDate,
    price,
    success: !!(fromLocation || toLocation || price),
    error: 'Generic scraping - results may be incomplete'
  };
}
