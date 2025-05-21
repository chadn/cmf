/*
Node  v22.7.0+ can run typescript natively (some support)
https://nodejs.org/en/learn/typescript/run-natively
node --experimental-transform-types upstash-redis.ts
*/

import { Redis } from '@upstash/redis'
import readline from 'readline'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '../../.env.local') })

const ME = 'node --experimental-transform-types upstash-redis.ts'
const HELP_MESSAGE = `
Available commands:
get-keys <pattern>      - Output first 10 keys matching pattern (use '*' for all keys). If less than 10 keys, includes TTL and size.
get-keys-all <pattern>  - Output all keys matching pattern (use '*' for all keys). Good to redirect to a file.
get-key-count <pattern> - Output count of keys matching pattern
get-value <key>         - Output value for a specific key
get-prefixes            - Output list counts for each prefix
delete-keys <pattern>   - Delete keys matching pattern. Confirmation required.
fix-location <k1> <k2>  - updates the value of k1 to be just like the k2's value while preseriving k1's original_location. Also sets k1's TTL to never expire.

  Examples:
${ME} 
${ME} get-key-count 'plura:*'
${ME} get-keys 'plura:city:'
${ME} get-keys-all  > keys.txt
${ME} delete-keys 'plura:city:*'
${ME} fix-location example 
${ME} fix-location 'location:Asiento' 'location:Asiento,sf,ca' 
  Note you create proper location keys using geocode cmd:
  curl 'https://cmf-chad.vercel.app/api/geocode?a=Asiento,sf,ca'

  time ${ME} get-prefixes
  ...
  Key prefixes and counts:
    location: 1681 keys
    plura: 794 keys
    plura:event: 794 keys
    events: 1 keys
    events:gc: 1 keys

  real 4.331	user 0.500	sys 0.053	pcpu 12.78

`

const FIX_LOCATION_EXAMPLE = `

======= EXAMPLE FIXING LOCATION: =============================================
On map, Click on it, in event popup, hover over "View Original Event" to get location key (k1)
   (or look at html and copy title). ex: location:Asiento
Figure out what location it should be, and store in geolocation cache, noting the key name (k2). ex:
   curl 'https://cmf-chad.vercel.app/api/geocode?a=Asiento,sf,ca'
Update value for location key using [upstash-redis.ts](../src/scripts/upstash-redis.ts) fix-location <k1> <k2>
   node upstash-redis.ts fix-location 'location:Asiento' 'location:Asiento,sf,ca'
==============================================================================


node --experimental-transform-types upstash-redis.ts get-value 'location:Pleasant Hill City Hall'
...
Value for key location:Pleasant Hill City Hall
{"original_location":"Pleasant Hill City Hall","formatted_address":"203 Paul St, Pleasant Hill, MO 64080, USA","lat":38.7862662,"lng":-94.2740786,"types":["establishment","local_government_office","point_of_interest"],"status":"resolved"}
{
  "original_location": "Pleasant Hill City Hall",
  "formatted_address": "203 Paul St, Pleasant Hill, MO 64080, USA",
  "lat": 38.7862662,
  "lng": -94.2740786,
  "types": [
    "establishment",
    "local_government_office",
    "point_of_interest"
  ],
  "status": "resolved"
}

// knew it should be in CA
curl 'https://cmf-chad.vercel.app/api/geocode?a=Pleasant+Hill+City+Hall,CA' && echo
{"resolved_location":{"original_location":"Pleasant Hill City Hall,CA","formatted_address":"100 Gregory Ln, Pleasant Hill, CA 94523, USA","lat":37.9473633,"lng":-122.063435,"types":["city_hall","establishment","local_government_office","point_of_interest"],"status":"resolved"},"source":"api"}


node --experimental-transform-types upstash-redis.ts get-value 'location:Pleasant Hill City Hall,CA'
...
Value for key location:Pleasant Hill City Hall,CA
{"original_location":"Pleasant Hill City Hall,CA","formatted_address":"100 Gregory Ln, Pleasant Hill, CA 94523, USA","lat":37.9473633,"lng":-122.063435,"types":["city_hall","establishment","local_government_office","point_of_interest"],"status":"resolved"}
{
  "original_location": "Pleasant Hill City Hall,CA",
  "formatted_address": "100 Gregory Ln, Pleasant Hill, CA 94523, USA",
  "lat": 37.9473633,
  "lng": -122.063435,
  "types": [
    "city_hall",
    "establishment",
    "local_government_office",
    "point_of_interest"
  ],
  "status": "resolved"
}


node --experimental-transform-types upstash-redis.ts get-keys 'location:Pleasant Hill City Hall'
...
All 2 keys matching: 'location:Pleasant Hill City Hall*'
  location:Pleasant Hill City Hall  Size: 238 bytes, TTL: 2487608  (28d 19h 8s)
  location:Pleasant Hill City Hall,CA  Size: 256 bytes, TTL: 2590870  (29d 23h 41m 10s)


node --experimental-transform-types upstash-redis.ts fix-location 'location:Pleasant Hill City Hall' 'location:Pleasant Hill City Hall,CA'
...
Fixed location for location:Pleasant Hill City Hall using value from location:Pleasant Hill City Hall,CA


node --experimental-transform-types upstash-redis.ts get-keys 'location:Pleasant Hill City Hall'
...
All 2 keys matching: 'location:Pleasant Hill City Hall*'
  location:Pleasant Hill City Hall  Size: 253 bytes, TTL: -1=INFINITE, will never expire
  location:Pleasant Hill City Hall,CA  Size: 256 bytes, TTL: 2590492  (29d 23h 34m 52s)


node --experimental-transform-types upstash-redis.ts get-value 'location:Pleasant Hill City Hall'
...
Value for key location:Pleasant Hill City Hall
{"original_location":"Pleasant Hill City Hall","formatted_address":"100 Gregory Ln, Pleasant Hill, CA 94523, USA","lat":37.9473633,"lng":-122.063435,"types":["city_hall","establishment","local_government_office","point_of_interest"],"status":"resolved"}
{
  "original_location": "Pleasant Hill City Hall",
  "formatted_address": "100 Gregory Ln, Pleasant Hill, CA 94523, USA",
  "lat": 37.9473633,
  "lng": -122.063435,
  "types": [
    "city_hall",
    "establishment",
    "local_government_office",
    "point_of_interest"
  ],
  "status": "resolved"
}


`

// Initialize Redis client
let redis: Redis | null = null

function getRedisClient(): Redis {
    if (!redis) {
        // Check if Upstash credentials are available
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            throw new Error('Upstash Redis credentials are not configured')
        }

        redis = new Redis({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        })
    }
    return redis
}

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

// Helper to prompt user and get response
const prompt = (question: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer)
        })
    })
}

// Helper to confirm action
const confirm = async (message: string): Promise<boolean> => {
    const answer = await prompt(`${message} (y/N): `)
    return answer.toLowerCase() === 'y'
}

// Get keys matching pattern
async function getKeys(pattern: string): Promise<string[]> {
    const client = getRedisClient()
    // client.keys(pattern) often yields "too many keys" error, so we use SCAN instead
    const keys: string[] = []
    let cursor = '0'
    do {
        const [nextCursor, foundKeys] = await client.scan(cursor, { match: pattern, count: 100 })
        cursor = nextCursor
        keys.push(...foundKeys)
    } while (cursor !== '0')
    return keys
}

// Get value for a key
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getValue(key: string): Promise<any> {
    const client = getRedisClient()
    return await client.get(key)
}

// Delete keys matching pattern
async function deleteKeys(pattern: string): Promise<number> {
    const client = getRedisClient()
    const { keys, info } = await getKeysWithInfo(pattern)
    if (keys.length === 0) {
        console.log('No keys found matching pattern:', pattern)
        return 0
    }
    console.log(`Found ${keys.length} keys matching pattern: '${pattern}'\nFirst 10:`, info)

    if (await confirm('Are you sure you want to delete these keys?')) {
        const pipeline = client.pipeline()
        keys.forEach((key) => pipeline.del(key))
        await pipeline.exec()
        return keys.length
    }
    return 0
}

// Get key count matching pattern
async function getKeyCount(pattern: string): Promise<number> {
    const keys = await getKeys(pattern)
    return keys.length
}

// Get prefixes and their counts
async function getPrefixes(): Promise<Record<string, number>> {
    const keys = await getKeys('*')
    const prefixes: Record<string, number> = {
        '': keys.length,
    }

    for (const key of keys) {
        // Split by : and build up prefixes
        const parts = key.split(':')
        // Only count parts up to the last colon as prefixes
        for (let i = 0; i < parts.length - 1; i++) {
            // Skip if the part contains anything other than lowercase letters
            if (!parts[i].match(/^[a-z]+$/)) continue
            const prefix = i === 0 ? `${parts[i]}:` : `${parts.slice(0, i + 1).join(':')}:`
            prefixes[prefix] = (prefixes[prefix] || 0) + 1
        }
    }

    return prefixes
}

function ttlStr(ttl: number): string {
    let ttlStr = `${ttl} `
    if (ttl === -1) {
        ttlStr = '-1=INFINITE, will never expire'
    } else if (ttl === -2) {
        ttlStr = '-2=NOT_FOUND (bug in upstash-redis.ts)'
    } else if (ttl === 0) {
        ttlStr = '0=EXPIRED, will be deleted soon'
    } else if (ttl > 60) {
        const days = Math.floor(ttl / 86400)
        const hours = Math.floor((ttl - days * 86400) / 3600)
        const minutes = Math.floor((ttl - days * 86400 - hours * 3600) / 60)
        const seconds = ttl - days * 86400 - hours * 3600 - minutes * 60
        ttlStr += ` (${days ? days + 'd ' : ''}${hours ? hours + 'h ' : ''}${minutes ? minutes + 'm ' : ''}${
            seconds ? seconds + 's' : ''
        })`
    }
    return ttlStr
}

// Get key info (TTL and size)
async function getKeyInfo(key: string): Promise<{ ttl: number; size: number; ttlStr: string }> {
    const client = getRedisClient()
    const [ttl, value] = await Promise.all([client.ttl(key), client.get(key)])
    return {
        size: JSON.stringify(value).length,
        ttl,
        ttlStr: ttlStr(ttl),
    }
}

// Get keys matching pattern with enhanced info for small sets
async function getKeysWithInfo(
    pattern: string,
    showAll: boolean = false
): Promise<{
    keys: string[]
    info?: Record<string, { ttl: number; size: number; ttlStr: string }> // only on first 10 keys if showAll is false
}> {
    const allKeys = await getKeys(pattern)
    if (showAll) {
        return { keys: allKeys }
    }
    const info: Record<string, { ttl: number; size: number; ttlStr: string }> = {}
    for (const key of allKeys.slice(0, 10)) {
        info[key] = await getKeyInfo(key)
    }
    return { keys: allKeys, info }
}

// Fix location by copying k2's value to k1 while preserving k1's original_location
async function fixLocation(k1: string, k2: string): Promise<void> {
    const client = getRedisClient()
    const v2 = await client.get(k2)
    if (!v2) {
        throw new Error(`Key ${k2} not found`)
    }
    const v1 = await client.get(k1)
    if (!v1) {
        throw new Error(`Key ${k1} not found`)
    }

    // Parse both values, handling both string and object cases
    const val2 = typeof v2 === 'string' ? JSON.parse(v2) : v2
    const val1 = typeof v1 === 'string' ? JSON.parse(v1) : v1

    // Copy k2's value to k1 but keep k1's original_location
    const fixedVal = {
        ...val2,
        original_location: val1.original_location,
    }

    // Store the fixed value and set TTL to never expire
    await client.set(k1, JSON.stringify(fixedVal))
    await client.persist(k1) // Remove any existing TTL
}

// Main function to handle commands
async function main() {
    const args = process.argv.slice(2)
    const command = args[0]
    console.log('\n')
    if (!command) {
        console.log(HELP_MESSAGE)
        process.exit(0)
    }

    try {
        switch (command) {
            case 'get-keys':
            case 'get-keys-all': {
                let pattern = args[1] || '*'
                if (!pattern.includes('*')) {
                    pattern = `${pattern}*`
                }
                const { keys, info } = await getKeysWithInfo(pattern, command === 'get-keys-all')
                if (command === 'get-keys-all') {
                    // support json option in the future: process.stdout.write(JSON.stringify(keys, null, 2))
                    process.stdout.write(keys.join('\n'))
                } else {
                    console.log(`Found ${keys.length} keys matching pattern: '${pattern}'\nFirst 10:`, info)
                    console.log(`${ME} get-value '${keys[0]}'`)
                }
                break
            }
            case 'get-key-count': {
                const pattern = args[1]
                if (!pattern) {
                    console.error('Error: Pattern is required')
                    process.exit(1)
                }
                const count = await getKeyCount(pattern)
                console.log(`Found ${count} keys matching pattern: ${pattern}`)
                break
            }
            case 'get-prefixes': {
                const prefixes = await getPrefixes()
                console.log('Key prefixes and counts:')
                Object.entries(prefixes)
                    .sort(([a, countA], [b, countB]) => a.localeCompare(b) || countB - countA)
                    .forEach(([prefix, count]) => {
                        console.log(`  ${prefix} ${count} keys`)
                    })
                break
            }
            case 'get-value': {
                const key = args[1]
                if (!key) {
                    console.error('Error: Key is required')
                    process.exit(1)
                }
                const value = await getValue(key)
                console.log(`Value for key ${key}\n${JSON.stringify(value)}\n${JSON.stringify(value, null, 2)}`)
                break
            }
            case 'delete-keys': {
                const pattern = args[1]
                if (!pattern) {
                    console.error('Error: Pattern is required')
                    process.exit(1)
                }
                const deleted = await deleteKeys(pattern)
                console.log(`Deleted ${deleted} keys`)
                break
            }
            case 'fix-location': {
                const k1 = args[1]
                const k2 = args[2]
                if (k1 === 'example') {
                    console.log(FIX_LOCATION_EXAMPLE)
                    process.exit(0)
                }
                if (!k1 || !k2) {
                    console.error('Error: Both keys are required. To see example,\n  fix-location example ')
                    process.exit(1)
                }
                await fixLocation(k1, k2)
                console.log(`Fixed location for ${k1} using value from ${k2}`)
                break
            }
            default:
                console.error('Unknown command:', command)
                console.log(HELP_MESSAGE)
                process.exit(1)
        }
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
    } finally {
        rl.close()
    }
}

// Run the script
main()
