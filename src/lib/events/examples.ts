export type ExampleEventSource = {
    name: string
    id?: string
    shortId?: string
    ids?: { [key: string]: string }
}

// Example event sources for demonstration
export const ExampleEventsSources: ExampleEventSource[] = [
    {
        name: 'SF Bay Music + FB Events',
        id: '19hz:BayArea,gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com',
        shortId: 'sf', // can just do es=sf in the url for 2 sources
    },
    {
        name: 'Other Music Events (19hz.info)',
        // id: is ignored if ids: is present
        ids: {
            '19hz:BayArea': 'SF Bay Area',
            '19hz:LosAngeles': 'Los Angeles',
            '19hz:LasVegas': 'Las Vegas',
            '19hz:ORE': 'Oregon',
            '19hz:Seattle': 'Seattle',
            '19hz:BC': 'Vancouver',
            '19hz:Toronto': 'Toronto',
            '19hz:CHI': 'Chicago',
            '19hz:Iowa': 'Iowa',
            '19hz:Denver': 'Denver',
            '19hz:Texas': 'Texas',
            '19hz:Miami': 'Miami',
            '19hz:Atlanta': 'Atlanta',
            '19hz:DC': 'DC Area',
            '19hz:PHL': 'Philly',
            '19hz:Massachusetts': 'Massachusetts',
            '19hz:BayArea,19hz:LosAngeles': 'California',
            '19hz:BayArea,19hz:LosAngeles,19hz:LasVegas,19hz:ORE,19hz:Seattle,19hz:BC': 'West Coast',
        },
        shortId: '19hz:all',
    },
    {
        name: 'SF Bay Facebook Events',
        id: 'gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com',
        shortId: 'chadrock', // can just do es=chadrock in the url
    },
    {
        name: 'Punk Shows from Foopee',
        id: 'foopee:all',
    },
    {
        name: 'Protests 2025',
        ids: {
            'dissent:june14-no-kings': 'June 14 No Kings WeThePeopleDissent.net',
            'protest:all': 'pol-rev.com',
        },
    },
    {
        name: 'Geocaching in Spain',
        id: 'gc:geocachingspain@gmail.com',
    },
    {
        name: 'Plura Community Events (slow data load)',
        id: 'plura:all',
    },
    {
        name: 'Sample Facebook Events',
        // https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
        id: 'fb:677700808-3RlHDZnbeH2YJMpJ',
    },
    {
        name: 'Test Events',
        id: 'test:all',
    },
]
