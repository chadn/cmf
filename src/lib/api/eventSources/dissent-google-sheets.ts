import { CmfEvent, EventSourceParams, EventSourceResponse, EventSourceType } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSource } from './index'
import { axiosGet } from '@/lib/utils/utils-server'
import { HttpError } from '@/types/error'
import { parseDateString } from '@/lib/utils/timezones'

const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY
const SHEET_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets/'
const SHEET_ID = '1f-30Rsg6N_ONQAulO-yVXTKpZxXchRRB2kD3Zhkpe_A'
// https://sheets.googleapis.com/v4/spreadsheets/<SHEET_ID>?fields=sheets.properties.title&key=API_KEY
const sheetTabs = {
    june14protests: 'June 14 Protests ',
    'june14-no-kings': 'June 14 Protests ',
    june6protests: 'June 6 Protests ',
}

export class DissentGoogleSheetsSource extends BaseEventSourceHandler {
    public readonly type: EventSourceType = {
        prefix: 'dissent',
        name: 'WeThePeopleDissent.net',
    }
    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        const sheetTab =
            params.id in sheetTabs ? sheetTabs[params.id as keyof typeof sheetTabs] : sheetTabs.june14protests
        const sheetUrl = `${SHEET_BASE_URL}${SHEET_ID}/values/${encodeURIComponent(sheetTab)}`
        const sheetName = sheetTab.startsWith('June 14') ? 'June 14 No Kings' : sheetTab

        logr.info('api-es-gsheet', `Fetching events from Google Sheets: ${sheetUrl}`)
        try {
            const response = await axiosGet(sheetUrl, { key: API_KEY })
            const { values } = response.data
            if (!values || values.length < 2) {
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
                // Parse date
                let startIso = ''
                let endIso = ''
                if (rowObj['Date']) {
                    const startDate = parseDateString(rowObj['Date'] + ' ' + rowObj['Time'])
                    if (startDate && !isNaN(startDate.getTime())) {
                        startIso = startDate.toISOString()
                        if ('Time' in rowObj && rowObj['Time']) {
                            // Hack: Set end to be 1 minute after start for when end time is not known
                            endIso = new Date(startDate.getTime() + 1000 * 60).toISOString()
                        } else {
                            // Hack: Set end to be same as start for when exact start time is not known
                            endIso = startIso
                        }
                    } else {
                        logr.info('api-es-gsheet', `NO DATE: "${rowObj['Date']} ${rowObj['Time']}"`)
                    }
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
                    description: rowObj['Info'] || '',
                    description_urls,
                    start: startIso,
                    end: endIso,
                    startSecs,
                    tz: 'LOCAL', // TODO: get timezone from lat/lng
                    original_event_url: rowObj['Link'] || '',
                    location,
                    note: rowObj['ADA Accessible'] ? `ADA: ${rowObj['ADA Accessible']}` : undefined,
                })
            }
            logr.info('api-es-gsheet', `Returning ${events.length} events from Google Sheets`)
            return {
                httpStatus: 200,
                events,
                metadata: {
                    id: params.id || '',
                    name: this.type.name + ' ' + sheetName,
                    type: this.type,
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
registerEventSource(dissentGoogleSheetsSource)

export default dissentGoogleSheetsSource
