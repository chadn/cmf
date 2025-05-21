/* TODO: wait till jest and cheerio can play nicely together 

cheerio@1.x uses native ES module syntax (import, export) only.
Jest, by default, runs in CommonJS mode and cannot handle ESM dependencies unless explicitly configured.

Option 1: Downgrade cheerio to v0.22.x
This version is CommonJS and works with Jest without extra setup

✅ Option 2: Configure Jest to support ESM
If you need cheerio@1.x, you'll need to:
Use jest 28+ or newer (ideally latest).

✅ Option 3: Use a different testing framework
If you're open to switching, Mocha is known to work well with cheerio@1.x.

*/

describe('Plura Scraper', () => {
    describe('dummy', () => {
        it('should be true', () => {
            expect(true).toBe(true)
        })
    })
})

// The following is the HTML from https://plra.io/events/city/Oakland_CA
const mockHtmlSections = `
<div class="sc-12677c8b-0 gqRWA">
    <section class="sc-3d21751e-0 liikAU">
        <a href="https://heyplura.com/events/explore-east-bay-poly-hike-518" class="sc-3d21751e-1 cKFiMI"
            ><div
                content="https://d1ne94wy7mt59y.cloudfront.net/prod/2a048dd9-3689-425b-b923-acc9f684a97c/600x300"
                class="sc-3d21751e-2 cebHCd"
            ></div>
            <div class="sc-3d21751e-3 btTNpJ">
                <h2 class="sc-3d21751e-4 ceyTq">Explore East Bay Poly Hike</h2>
                <div class="sc-3d21751e-5 kxLaic">
                    <div class="sc-3d21751e-6 iOvUNx">
                        <li title="Date" class="sc-b666ede7-0 dwsoaw">
                            <svg
                                viewBox="0 0 24 24"
                                role="presentation"
                                class="sc-b666ede7-1 lkByMH"
                                style="margin-top: 2px; width: 16px; height: 16px"
                            >
                                <path
                                    d="M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z"
                                    style="fill: currentcolor"
                                ></path></svg
                            ><span class="sc-b666ede7-2 ftPosk">Saturday, May 17th at 10am</span>
                        </li>
                        <li title="Address" class="sc-b666ede7-0 dwsoaw">
                            <svg
                                viewBox="0 0 24 24"
                                role="presentation"
                                class="sc-b666ede7-1 lkByMH"
                                style="margin-top: 2px; width: 16px; height: 16px"
                            >
                                <path
                                    d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
                                    style="fill: currentcolor"
                                ></path></svg
                            ><span class="sc-b666ede7-2 ftPosk">Oakland</span>
                        </li>
                    </div>
                    <div class="sc-3d21751e-7 cfnqrd">
                        <svg viewBox="0 0 24 24" role="presentation" style="width: 20px; height: 20px">
                            <path
                                d="M19 17V19H7V17S7 13 13 13 19 17 19 17M16 8A3 3 0 1 0 13 11A3 3 0 0 0 16 8M19.2 13.06A5.6 5.6 0 0 1 21 17V19H24V17S24 13.55 19.2 13.06M18 5A2.91 2.91 0 0 0 17.11 5.14A5 5 0 0 1 17.11 10.86A2.91 2.91 0 0 0 18 11A3 3 0 0 0 18 5M7.34 8.92L8.5 10.33L3.75 15.08L1 12.08L2.16 10.92L3.75 12.5L7.34 8.92"
                                style="fill: rgb(34, 43, 69)"
                            ></path>
                        </svg>
                        <div class="sc-3d21751e-8 eqJeiE">32</div>
                    </div>
                </div>
            </div></a
        >
    </section>
    <section class="sc-3d21751e-0 liikAU">
        <a href="https://heyplura.com/events/bare-to-breakers-at-bay-to-breakers" class="sc-3d21751e-1 cKFiMI"
            ><div
                content="https://d1ne94wy7mt59y.cloudfront.net/prod/0c8800e9-5876-4305-bd7d-92bf8bb21b0b/600x300"
                class="sc-3d21751e-2 dWNXFg"
            ></div>
            <div class="sc-3d21751e-3 btTNpJ">
                <h2 class="sc-3d21751e-4 ceyTq">Bare to Breakers (at Bay to Breakers)</h2>
                <div class="sc-3d21751e-5 kxLaic">
                    <div class="sc-3d21751e-6 iOvUNx">
                        <li title="Date" class="sc-b666ede7-0 dwsoaw">
                            <svg
                                viewBox="0 0 24 24"
                                role="presentation"
                                class="sc-b666ede7-1 lkByMH"
                                style="margin-top: 2px; width: 16px; height: 16px"
                            >
                                <path
                                    d="M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z"
                                    style="fill: currentcolor"
                                ></path></svg
                            ><span class="sc-b666ede7-2 ftPosk">Sunday, May 18th at 7:30am</span>
                        </li>
                        <li title="Address" class="sc-b666ede7-0 dwsoaw">
                            <svg
                                viewBox="0 0 24 24"
                                role="presentation"
                                class="sc-b666ede7-1 lkByMH"
                                style="margin-top: 2px; width: 16px; height: 16px"
                            >
                                <path
                                    d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
                                    style="fill: currentcolor"
                                ></path></svg
                            ><span class="sc-b666ede7-2 ftPosk">San Francisco</span>
                        </li>
                    </div>
                    <div class="sc-3d21751e-7 cfnqrd">
                        <svg viewBox="0 0 24 24" role="presentation" style="width: 20px; height: 20px">
                            <path
                                d="M19 17V19H7V17S7 13 13 13 19 17 19 17M16 8A3 3 0 1 0 13 11A3 3 0 0 0 16 8M19.2 13.06A5.6 5.6 0 0 1 21 17V19H24V17S24 13.55 19.2 13.06M18 5A2.91 2.91 0 0 0 17.11 5.14A5 5 0 0 1 17.11 10.86A2.91 2.91 0 0 0 18 11A3 3 0 0 0 18 5M7.34 8.92L8.5 10.33L3.75 15.08L1 12.08L2.16 10.92L3.75 12.5L7.34 8.92"
                                style="fill: rgb(34, 43, 69)"
                            ></path>
                        </svg>
                        <div class="sc-3d21751e-8 eqJeiE">33</div>
                    </div>
                </div>
            </div></a
        >
    </section>
</div>
`
// The following is the HTML from https://plra.io/events/city/Oakland_CA
const mockHtmlNextPage = `
<div class="sc-40158c73-2 iDNaox">
    <a href="https://plra.io/events/city/Oakland_CA?page=2">
        <button class="sc-ljLmeM sc-gqYRWL fwIIhf fiOJFs">
            <span class="sc-dOEwtB crHFgL button-content">Next Page</span>
        </button></a
    >
</div>
`
// The following is the HTML from https://plra.io/events/city
const mockCityHtml = `
<ul class="sc-b70c164a-0 kOrsOK">
    <li class="sc-b70c164a-1 kalQHb"><a href="/events/city/Vancouver_BC_CA">Vancouver, BC, CA</a></li>
    <li class="sc-b70c164a-1 kalQHb"><a href="/events/city/Oakland_CA">Oakland, CA</a></li>
    <li class="sc-b70c164a-1 kalQHb"><a href="/events/city/Amsterdam__NL">Amsterdam, NL</a></li>
    <li class="sc-b70c164a-1 kalQHb"><a href="/events/city/El%20Cuyo__MX">El Cuyo, MX</a></li>
</ul>
`

// quiet warnings about unused variables
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allHtml = mockHtmlSections + mockHtmlNextPage + mockCityHtml

// Mock dependencies
jest.mock('@/lib/utils/utils-server', () => ({
    axiosGet: jest.fn(),
}))

jest.mock('@/lib/utils/logr', () => ({
    logr: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

jest.mock('../cache', () => ({
    getCityListCache: jest.fn(),
    setCityListCache: jest.fn(),
    getCachedEvent: jest.fn(),
}))

// Mock the parsePluraDateString and other utility functions
jest.mock('../utils', () => ({
    parsePluraDateString: jest.fn(() => ({
        startDate: new Date('2023-05-15T14:00:00'),
        endDate: new Date('2023-05-15T15:00:00'),
    })),
    improveLocation: jest.fn((location, cityName) => `${location}, ${cityName.split(',')[1]}`),
    convertCityNameToKey: jest.fn((name) => name.toLowerCase().replace(/,\s*/g, '_')),
    convertCityNameToUrl: jest.fn(),
}))
