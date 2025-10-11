import { CmfEvent, EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventsSource } from './index'
import { axiosGet } from '@/lib/utils/utils-server'
import { HttpError } from '@/types/error'
import { parseDateFromDissent } from '@/lib/utils/date'

const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY
const SHEET_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets/'
const SHEET_ID = '1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A'
// https://sheets.googleapis.com/v4/spreadsheets/<SHEET_ID>?fields=sheets.properties.title&key=API_KEY
const idToSheetTabs = {
    june14protests: 'June 14 Protests ',
    'june14-no-kings': 'June 14 Protests ',
    june6protests: 'June 6 Protests ',
    oct18protests: 'No Kings - October 18 ',
    oct18nokings: 'No Kings - October 18',
}

// parse counts?
// https://docs.google.com/spreadsheets/d/1hQzNbsbupLqtijfQywpmZs6nKSNLmEbugaYl6HWbyvA/edit?gid=468285823#gid=468285823

export class DissentGoogleSheetsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'dissent',
        name: 'We The People Dissent',
        url: 'https://www.wethepeopledissent.net/',
    }
    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        if (!(params.id in idToSheetTabs)) {
            logr.info(
                'api-es-gsheet',
                `Unknown sheet id: ${params.id}. Known ids: ${Object.keys(idToSheetTabs).join(', ')}`
            )
            throw new HttpError(404, `id "${params.id}" not found in idToSheetTabs`)
            // TODO: fetch current sheet tab data and log it
        }
        const sheetTab = idToSheetTabs[params.id as keyof typeof idToSheetTabs]
        const sheetUrl = `${SHEET_BASE_URL}${SHEET_ID}/values/${encodeURIComponent(sheetTab)}`

        logr.info('api-es-gsheet', `Fetching events from Google Sheets "${sheetTab}" ${sheetUrl}`)
        try {
            const response = await axiosGet(sheetUrl, { key: API_KEY })
            const { values } = response.data
            if (!values || values.length < 2) {
                logr.info('api-es-gsheet', `No data found in Google Sheet: ${JSON.stringify(response)}`)
                throw new HttpError(503, 'No data found in Google Sheet')
            }
            // Row 7 (index 6) is the header row
            const headers = values[6].map((h: string) => h.trim())
            const events: CmfEvent[] = []
            for (let i = 1; i < values.length; i++) {
                const row = values[i]
                const rowObj: Record<string, string> = {}
                headers.forEach((h: string, idx: number) => {
                    rowObj[h] = row[idx] || ''
                })
                // Compose location
                const location = [rowObj['Address'], rowObj['City'], rowObj['State'], rowObj['Zip'], rowObj['Country']]
                    .filter(Boolean)
                    .join(', ')
                const { startIso, endIso } = parseDateFromDissent(rowObj['Date'], rowObj['Time'])
                if (!(startIso && endIso)) {
                    logr.info('api-es-gsheet', `NO DATE: "${rowObj['Date']} ${rowObj['Time']}"`)
                }
                const startSecs = startIso ? new Date(startIso).getTime() / 1000 : undefined
                // Extract URLs from Info
                const description_urls = rowObj['Info']
                    ? Array.from(rowObj['Info'].matchAll(/https?:\/\/\S+/g)).map((m) => m[0])
                    : []
                if (!(startIso && rowObj['Name'] && rowObj['Link'])) {
                    logr.debug('api-es-gsheet', `Skipping event: ${JSON.stringify(rowObj)}`)
                    continue
                }
                const newId = rowObj['Link'].replace(/https?:\/\//g, '')
                if (events.some((event) => event.id === newId)) continue
                events.push({
                    id: newId,
                    name: rowObj['Name'] || '',
                    description: `${rowObj['Date']} ${rowObj['Time']} ${rowObj['Info']}`,
                    description_urls,
                    start: startIso,
                    end: endIso,
                    startSecs,
                    tz: 'REINTERPRET_UTC_TO_LOCAL', // TODO: get timezone from lat/lng
                    original_event_url: rowObj['Link'] || '',
                    location,
                    note: rowObj['ADA Accessible'] ? `ADA: ${rowObj['ADA Accessible']}` : undefined,
                })
            }
            logr.info('api-es-gsheet', `Returning ${events.length} events from Google Sheets`)
            return {
                httpStatus: 200,
                events,
                source: {
                    ...this.type,
                    id: params.id || '',
                    name: this.type.name + ' ' + sheetTab,
                    totalCount: events.length,
                    unknownLocationsCount: events.filter((e) => !e.location).length,
                },
            }
        } catch (error) {
            logr.error(
                'api-es-gsheet',
                `Failed to fetch or parse Google Sheets: ${error instanceof Error ? error.message : error}`
            )
            if (error instanceof HttpError) {
                throw error
            } else {
                throw new HttpError(500, 'Failed to fetch or parse Google Sheets')
            }
        }
    }
}

const dissentGoogleSheetsSource = new DissentGoogleSheetsSource()
registerEventsSource(dissentGoogleSheetsSource)

export default dissentGoogleSheetsSource
