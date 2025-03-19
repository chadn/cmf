export interface GoogleCalendarEvent {
    id: string
    summary: string
    description?: string
    location?: string
    start: {
        dateTime?: string
        date?: string
        timeZone?: string
    }
    end: {
        dateTime?: string
        date?: string
        timeZone?: string
    }
    htmlLink: string
    recurrence?: string[]
}

export interface GoogleCalendarResponse {
    kind: string
    etag: string
    summary: string
    description?: string
    updated: string
    timeZone: string
    accessRole: string
    items: GoogleCalendarEvent[]
}

/* Example response from GOOGLE_MAPS_GEOCODING_API
{
  address_components: [
    { long_name: '2367', short_name: '2367', types: [ 'street_number' ] },
    {
      long_name: 'Shattuck Avenue',
      short_name: 'Shattuck Ave.',
      types: [ 'route' ]
    },
    {
      long_name: 'Downtown Berkeley',
      short_name: 'Downtown Berkeley',
      types: [ 'neighborhood', 'political' ]
    },
    {
      long_name: 'Berkeley',
      short_name: 'Berkeley',
      types: [ 'locality', 'political' ]
    },
    {
      long_name: 'Alameda County',
      short_name: 'Alameda County',
      types: [ 'administrative_area_level_2', 'political' ]
    },
    {
      long_name: 'California',
      short_name: 'CA',
      types: [ 'administrative_area_level_1', 'political' ]
    },
    {
      long_name: 'United States',
      short_name: 'US',
      types: [ 'country', 'political' ]
    },
    { long_name: '94704', short_name: '94704', types: [ 'postal_code' ] },
    {
      long_name: '1552',
      short_name: '1552',
      types: [ 'postal_code_suffix' ]
    }
  ], 
  formatted_address: '2367 Shattuck Ave., Berkeley, CA 94704, USA',
  geometry: {
    location: { lat: 37.8663201, lng: -122.2673229 },
    location_type: 'ROOFTOP',
    viewport: { northeast: [Object], southwest: [Object] }
  },
  navigation_points: [ { location: [Object], road_name: '' } ],
  place_id: 'ChIJ76iZzIJ-hYARzVJIWWU3cwU',
  plus_code: { compound_code: 'VP8M+G3 Berkeley, CA', global_code: '849VVP8M+G3' },
  types: [
    'bar',
    'establishment',
    'food',
    'night_club',
    'point_of_interest',
    'restaurant'
  ]
}
*/

export interface GoogleGeocodeResult {
    formatted_address: string
    geometry: {
        location: {
            lat: number
            lng: number
        }
        location_type: string
        viewport: {
            northeast: {
                lat: number
                lng: number
            }
            southwest: {
                lat: number
                lng: number
            }
        }
    }
    place_id: string
    plus_code?: {
        compound_code: string
        global_code: string
    }
    types: string[]
    address_components?: Array<{
        long_name: string
        short_name: string
        types: string[]
    }>
}

export interface GeocodeResponse {
    results: GoogleGeocodeResult[]
    status: string
}
