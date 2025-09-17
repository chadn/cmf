// Example event sources for demonstration
export const ExampleEventsSources = [
    {
        name: 'SF Bay Music + FB Events',
        id: '19hz:BayArea,gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com',
        shortId: 'sf', // can just do es=sf in the url for 2 sources
    },
    {
        name: 'SF Bay Music Events (19hz.info)',
        id: '19hz:BayArea',
        shortId: '19hz', // can just do es=19hz in the url
    },
    {
        name: 'Other Music Events (19hz.info)',
        ids: {
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
            '19hz:Philadelphia': 'Philly',
            '19hz:Massachusetts': 'Massachusetts',
            '19hz:BayArea,19hz:LosAngeles': 'California',
            '19hz:BayArea,19hz:LosAngeles,19hz:LasVegas,19hz:ORE,19hz:Seattle,19hz:BC': 'West Coast',
        },
    },
    {
        name: 'SF Bay Facebook Events',
        id: 'gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com',
        shortId: 'chadrock', // can just do es=chadrock in the url
    },
    {
        name: 'Geocaching in Spain',
        id: 'gc:geocachingspain@gmail.com',
    },
    {
        name: 'Protests from WeThePeopleDissent.net',
        id: 'dissent:june14-no-kings',
    },
    {
        name: 'Protests from pol-rev.com',
        id: 'protest:all',
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
]
