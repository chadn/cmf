// @ts-check
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

/*
curl 'https://heyplura.com/events/bonobo-meetup-051325' >plura.event.bonobo-meetup-051325.html
curl 'https://heyplura.com/events/city/Oakland_CA' >plura.city.Oakland_CA.html
curl 'https://heyplura.com/events/city' >plura.cities.html
*/

// Analyze HTML structure
async function analyzeHtmlFiles() {
    try {
        console.log('================== ANALYZING PLURA HTML FILES ==================')

        // Read the city list file
        const citiesHtml = fs.readFileSync(path.join(process.cwd(), 'data', 'plura.cities.html'), 'utf-8')
        const $cities = cheerio.load(citiesHtml)

        console.log('\n--- CITY LIST PAGE ANALYSIS ---')
        // Find city links
        const cityLinks = $cities('a')
            .map((_, el) => {
                const href = $cities(el).attr('href')
                if (href && href.startsWith('/events/city/')) {
                    return {
                        href,
                        text: $cities(el).text().trim(),
                    }
                }
                return null
            })
            .get()
            .filter(Boolean)

        console.log(`Found ${cityLinks.length} city links`)
        if (cityLinks.length > 0) {
            console.log('Sample city links:')
            cityLinks.slice(0, 5).forEach((link) => {
                console.log(`  - ${link.href} -> ${link.text}`)
            })
        }

        // Read the Oakland city page
        const cityHtml = fs.readFileSync(path.join(process.cwd(), 'data', 'plura.city.Oakland_CA.html'), 'utf-8')
        const $city = cheerio.load(cityHtml)

        console.log('\n--- CITY PAGE ANALYSIS (Oakland_CA) ---')

        // Find sections with events
        const eventSections = $city('section')
        console.log(`Found ${eventSections.length} sections on the city page`)

        // Analyze first 3 sections in detail
        if (eventSections.length > 0) {
            console.log('Detail analysis of first 3 sections:')

            $city('section')
                .slice(0, 3)
                .each((i, section) => {
                    const $section = $city(section)
                    const classNames = $section.attr('class')
                    const title = $section.find('h2').text().trim()
                    const link = $section.find('a').attr('href')
                    const dateEl = $section.find('li[title="Date"]')
                    const dateText = dateEl.find('span').text().trim()
                    const addressEl = $section.find('li[title="Address"]')
                    const addressText = addressEl.find('span').text().trim()
                    const attendeeEl = $section.find('div[class$="-8"]')
                    const attendeeText = attendeeEl.text().trim()

                    console.log(`\nSection ${i + 1}:`)
                    console.log(`  Class: ${classNames}`)
                    console.log(`  Title: ${title}`)
                    console.log(`  Link: ${link}`)
                    console.log(`  Date: ${dateText}`)
                    console.log(`  Address: ${addressText}`)
                    console.log(`  Attendees: ${attendeeText}`)

                    // Look for dynamic class patterns
                    const dynamicClasses = []
                    $section.find('*').each((_, el) => {
                        const cls = $city(el).attr('class')
                        if (cls && cls.match(/sc-[a-z0-9]+-\d+/)) {
                            dynamicClasses.push(cls)
                        }
                    })

                    const uniqueClasses = [...new Set(dynamicClasses)]
                    console.log(`  Dynamic classes: ${uniqueClasses.join(', ')}`)
                })
        }

        // Read the event page
        const eventHtml = fs.readFileSync(
            path.join(process.cwd(), 'data', 'plura.event.bonobo-meetup-051325.html'),
            'utf-8'
        )
        const $event = cheerio.load(eventHtml)

        console.log('\n--- EVENT PAGE ANALYSIS (bonobo-meetup) ---')

        // Find event details
        const eventTitle = $event('h1').text().trim()
        console.log(`Event title: ${eventTitle}`)

        // Find date/time information
        $event('li[title="Date"]').each((_, el) => {
            console.log(`Date info: ${$event(el).find('span').text().trim()}`)
        })

        // Find location information
        $event('li[title="Address"]').each((_, el) => {
            console.log(`Address info: ${$event(el).find('span').text().trim()}`)
        })

        // Find description
        const description = $event('div[class*="description"]').text().trim()
        console.log(`Description length: ${description.length} chars`)
        if (description.length > 0) {
            console.log(`Description preview: ${description.substring(0, 100)}...`)
        }

        console.log('\nAnalysis complete!\n')
    } catch (error) {
        console.error('Error analyzing HTML files:', error)
    }
}

// Run the analysis
analyzeHtmlFiles()
    .then(() => console.log('Analysis completed successfully'))
    .catch((err) => console.error('Analysis failed:', err))
