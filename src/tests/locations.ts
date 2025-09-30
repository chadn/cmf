import { CmfEvent } from '@/types/events'
import { addDays, addHours, startOfMonth } from 'date-fns'

export function getTestLocation(offset: number): string {
    const suffix = ', CA, USA'
    const locations = LOCATIONS_STRING.trim().split('\n')
    const index = offset % locations.length
    return locations[index] + suffix
}

/*
 * Create a random test event
 * @param rand8 - Optional random 8-digit number.  Identical events returned for the same value.
 * @param startTimes - Optional start times to be used randomlyfor the event.
 * @returns A test event object.
 */
export function createTestEvent({
    rand8 = Math.floor(Math.random() * 10 ** 8),
    startTimes = [3, 13, 23], // 24 hr format
}: {
    rand8?: number
    startTimes?: number[]
} = {}): CmfEvent {
    const startHour = startTimes[Math.floor((startTimes.length * rand8) / 10 ** 8)]
    const id = `test-${rand8}`
    const name = 'Test Event ' + rand8
    const description = 'Test event description for ' + rand8

    // for given rand8, need same exact event.start for any day of the month.
    // also want to make sure we get days before and after the current day, between -40 and +40
    const startDateTime = addDays(startOfMonth(new Date()), (rand8 % 50) - 10) // push forward up to 40 days
    startDateTime.setHours(startHour, 0, 0, 0)
    const endDateTime = addHours(startDateTime, 2)

    return {
        id,
        name,
        description,
        description_urls: [],
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        tz: 'America/Los_Angeles',
        location: getTestLocation(rand8),
        original_event_url: `https://samo.org/${id}`,
    }
}

// venues from foopee.com
const LOCATIONS_STRING = `
13740 Arnold Drive, Glen Ellena
240 Front Street, S.F.
3437 Haven Street, West Oakland
3rd and Army Skatepark, S.F.
4 Star Theater, S.F.
49er's Stadium, Santa Clara
924 Gilman St., Berkeley
Oakland Arena, Oakland
August Hall, S.F.
Balboa Cafe, 3199 Fillmore Street, S.F.
Bimbo's 365 Club, S.F.
Bing Concert Hall, 327 Lasuen Street, Stanford, Palo Alto
Blue Lagoon, Santa Cruz
Blue Note, Napa
Bottom of the Hill, S.F.
Brewsters Beer Garden, 229 Water Street, Petaluma
Brick and Mortar, S.F.
Cafe Du Nord, S.F.
California Ballroom, 1736 Franklin Street, Oakland
California Theater, 345 S. First Street, San Jose
Caravan Lounge, San Jose
Catalyst Atrium, Santa Cruz
Ceremony, Oakland
Chapel, S.F.
Civic Auditorium, S.F.
Civic Center, S.F.
Cornerstone, Berkeley
Cow Palace, Daily City
Creekside, 140 Montgomery Street, San Jose
Crepe Place, Santa Cruz
Crybaby, Oakland
DNA Lounge, S.F.
Dala's Nest House, 371 Oconnor St., Menlo Park
Davies Symphony Hall, 201 Van Ness Ave., S.F.
Degrees Plato Taproom, 4251 MacArthur Blvd., Oakland
Drake's Barrel House, 1933 Davis Street
Eagle, S.F.
El Rio, S.F.
Eli's Mile High Club, Oakland
Faction Brewing, Alameda
Felton Music Hall, Felton
Fillmore, S.F.
First Church of The Buzzard, Oakland
Fox Theater, Oakland
Freight, Berkeley
Frost Amphitheater, Stanford Campus, Palo Alto
GGA Field, 13th Street at Avenue H, Treasure Island
Golden State Theater, 417 Alvarado St., Monterey
Good Time Tavern, 125 North Livermore Avenue, Livermore
Graton Resort, Rohnert Park
Great American Music Hall, S.F.
Great Northern, S.F.
Greek Theater, UC Berkeley Campus
Guild Theater, Memlo Park
Gundlach Bundschu Winery, Sonoma
Hardly Stricty Bluegrass, Golden Gate Park, S.F.
Henry J Kaiser Center, Oakland
Hersher's Pizza, 206 Broadway, Oakland
Hibernia Bank, 1 Jones Street, S.F.
Hopmonk Tavern, Novato
Hopmonk Tavern, Sebastopol
Hotel Utah, S.F.
Independent, S.F.
Ivy Room, Albany
Jack Kerouac Alley, S.F.
Jury Room, Santa Cruz
Kilowatt, S.F.
Knockout, S.F.
Knot Club, 1900 Stenmark Drive, Richmond
La Pena Center, 3105 Shattuck Avenue, Berkeley
Lagunitas Brewery, 1280 North McDowell Blvd, Petaluma
Little Hill Lounge, El Cerrito
Lot at Creekside, 135 S. Montgomery, San Jose
Lower Bobs Skatepark, 1899 9th Street, Oakland
Mabuhay Gardens, 435 Broadway, S.F.
Marines Memorial Theater, 609 Sutter Street, S.F.
Masonic, S.F.
Meritage Resort, Napa
Midway, S.F.
Mimosas of Willow Glen, 860 Willow Street
Moe's Alley, Santa Cruz
Monarch, S.F.
Moscone Center, S.F.
Mosswood Park, 3612 Webster Street, Oakland
Mountain Winery, Saratoga
Music City, S.F.
Mystic Theater, Petaluma
Neck of the Woods, S.F.
New Parish, Oakland
North Beach, S.F.
Oakland Secret Gallery, Oakland
Orpheum Theater, 1192 Market Street, S.F.
Palace of Fine Arts, S.F.
Paramount Theater, Oakland
Peacock Lounge, S.F.
Phoenix Hotel, 601 Eddy Street, S.F.
Phoenix Theater, Petaluma
Pittsburg California Theater, 351 Railroad Avenue, Pittsburg
Public Works, S.F.
Pussy Palace, 1137 34th Steet, Oakland
Regency Ballroom, S.F.
Rickshaw Stop, S.F.
Rio Theater, Santa Cruz
Ritz, San Jose
Rockys Beach, Berkeley Waterfront
Ruins at Watson Ranch, 501 Napa Junction Road, American Canyon
San Jose Civic Center, San Jose
Shapeshifters Cinema, 567 5th Street, Oakland
Shark Tank, San Jose
Shop, Santa Rosa
Shoreline Amphitheater, Mountain View
Stay Gold Deli, Oakland
Streetlight Records, Santa Cruz
Subrosa, Santa Cruz
Swedish American Hall, S.F.
Sweetwater Music Hall, Mill Valley
Tamarack, Oakland
Thee Parkside, S.F.
Thee Stork Club, Oakland
Thrillhouse Records, S.F.
UC Theater, Berkeley
Uptown Theater, Napa
Vets Hall, Santa Cruz
Vinnies's, 2045 Mt. Diablo Street, Concord
Warfield, S.F.
Warriors Stadium, S.F.
Winters Tavern, Pacifica
Yerba Buena Gardens, S.F.
Yoshi's, Oakland
`
