'use client'

import { useState, useEffect, useRef } from 'react'
import { format, subMonths, addMonths, addDays, differenceInCalendarDays } from 'date-fns'
import DateQuickButtons from './DateQuickButtons'
import { getDateFromUrlDateString, getStartOfDay, getEndOfDay } from '@/lib/utils/date'
import { calculateQuickFilterRange } from '@/lib/utils/quickFilters'
import { umamiTrack } from '@/lib/utils/umami'
import { logr } from '@/lib/utils/logr'
import { Calendar } from '@/components/ui/calendar'
import { Slider } from '@/components/ui/slider'
import * as Popover from '@radix-ui/react-popover'
import { AppState, AppAction, appActions, isReadyForUrlParsing } from '@/lib/state/appStateReducer'

interface DateAndSearchFiltersProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    dateSliderRange?: { start: string; end: string }
    onDateRangeChange: (range: { start: string; end: string } | undefined) => void
    onDateQuickFilterChange?: (value: string) => void
    appState: AppState
    // URL parameters for initial filter application
    searchQueryFromUrl?: string
    dateQuickFilterFromUrl?: string | null
    dateRangeFromUrl?: { sd?: string; ed?: string }
    dispatch: React.Dispatch<AppAction> // Direct dispatch function for state actions
}

export default function DateAndSearchFilters({
    searchQuery,
    onSearchChange,
    dateSliderRange,
    onDateRangeChange,
    onDateQuickFilterChange,
    appState,
    searchQueryFromUrl,
    dateQuickFilterFromUrl,
    dateRangeFromUrl,
    dispatch,
}: DateAndSearchFiltersProps) {
    const [showDateSliders, setShowDateSliders] = useState(false)

    // Use URL parameters directly from props
    const searchQueryUrl = searchQueryFromUrl
    const dateQuickFilterUrl = dateQuickFilterFromUrl

    // Date slider state
    const now = new Date()
    const minDate = getDateFromUrlDateString(dateRangeFromUrl?.sd || '-1m') || subMonths(now, 1)
    const maxDate = getDateFromUrlDateString(dateRangeFromUrl?.ed || '3m') || addMonths(now, 3)
    const totalDays = differenceInCalendarDays(maxDate, minDate)
    const [startDays, setStartDays] = useState(0)
    const [endDays, setEndDays] = useState(totalDays)

    useEffect(() => {
        if (!dateSliderRange) {
            setStartDays(0)
            setEndDays(totalDays)
        }
    }, [dateSliderRange, totalDays])

    useEffect(() => {
        if (showDateSliders) {
            umamiTrack('showDateSliders')
        }
    }, [showDateSliders])

    // Ref to track which URL parameters have been processed
    const urlParamsProcessed = useRef({
        dateQuickFilter: false,
        searchQuery: false,
    })

    // Handle URL parameters (domain filters: date and search) 
    useEffect(() => {
        if (!isReadyForUrlParsing(appState)) return
        
        let filtersApplied = false

        // Apply date quick filter from URL
        if (dateQuickFilterUrl && !urlParamsProcessed.current.dateQuickFilter) {
            logr.info('url-filters', `URL params: applying date filter "${dateQuickFilterUrl}" during ${appState}`)
            const todayDayValue = Math.floor((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
            const range = calculateQuickFilterRange(dateQuickFilterUrl, todayDayValue, totalDays, getDateFromDays)
            if (!range) {
                logr.warn('url-filters', `Unknown or invalid quick filter: ${dateQuickFilterUrl}`)
            } else {
                // Apply the date range with proper day boundaries
                setStartDays(range.start)
                setEndDays(range.end)
                onDateRangeChange({
                    start: getStartOfDay(range.start, minDate),
                    end: getEndOfDay(range.end, minDate),
                })
                logr.info('url-filters', `Applied date filter ${dateQuickFilterUrl}: days ${range.start}-${range.end}`)
            }
            urlParamsProcessed.current.dateQuickFilter = true
            filtersApplied = true
        }

        // Apply search filter from URL
        if (searchQueryUrl && !urlParamsProcessed.current.searchQuery) {
            logr.info('url-filters', `URL params: applying search filter "${searchQueryUrl}" during ${appState}`)            
            onSearchChange(searchQueryUrl)
            urlParamsProcessed.current.searchQuery = true
            logr.info('url-filters', `Applied search filter: "${searchQueryUrl}"`)
            filtersApplied = true
        }

        // Notify parent about URL filters completion (auto-resize will be handled separately in step 6)
        if (filtersApplied || (!dateQuickFilterUrl && !searchQueryUrl)) {
            dispatch(appActions.urlFiltersApplied())
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateQuickFilterFromUrl, searchQueryFromUrl, appState, now, minDate, totalDays, onDateRangeChange, onSearchChange, dispatch])

    // Convert slider value to date
    const getDateFromDays = (days: number) => {
        const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
        return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
    }

    // Helper: convert ISO string to Date
    const isoToDate = (iso?: string) => (iso ? new Date(iso) : undefined)

    // Compute current start/end as Date objects
    const startDate = isoToDate(getDateFromDays(startDays))
    const endDate = isoToDate(getDateFromDays(endDays))

    // Helper: check if two dates are in the same month and year
    const isSameMonth =
        startDate &&
        endDate &&
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth()

    // Handler for calendar selection
    const handleCalendarSelect = (date: Date | undefined, which: 'start' | 'end') => {
        if (!date) return
        const selectedDays = differenceInCalendarDays(date, minDate)
        // Update the start date by default. Update the end date if
        // - the selected date is after the end date
        // - the selected date is after the start AND which is 'end'
        let updateWhich = selectedDays > endDays ? 'end' : 'start'
        if (selectedDays > startDays && which === 'end') {
            updateWhich = 'end'
        }
        if (updateWhich === 'start') {
            setStartDays(selectedDays)
            onDateRangeChange({
                start: getStartOfDay(selectedDays, minDate),
                end: getEndOfDay(endDays, minDate),
            })
        } else {
            setEndDays(selectedDays)
            onDateRangeChange({
                start: getStartOfDay(startDays, minDate),
                end: getEndOfDay(selectedDays, minDate),
            })
        }
        if (onDateQuickFilterChange) onDateQuickFilterChange('')
    }

    const formatDateForButton = (date: Date) => {
        return format(date, 'MMM d EEE')
    }
    const startDateText = formatDateForButton(new Date(getDateFromDays(startDays)))
    const endDateText = formatDateForButton(new Date(getDateFromDays(endDays)))

    return (
        <div className="relative">
            <div className="flex flex-row items-center gap-2 w-full">
                <Popover.Root open={showDateSliders} onOpenChange={setShowDateSliders}>
                    <Popover.Trigger asChild>
                        <div className="min-w-0 flex-1 text-primary">
                            <div className="bg-white rounded-md shadow-sm overflow-hidden min-w-0">
                                <button
                                    className="w-full text-left text-sm md:text-md p-1 transition-colors bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200  duration-150"
                                    data-testid="date-range-dropdown"
                                >
                                    {startDateText} - {endDateText} {showDateSliders ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content className="z-50 w-[95vw] max-w-[480px] sm:w-[480px] p-0 bg-white rounded-md shadow-lg border mt-2 overflow-x-auto popover-content">
                            <div className="p-2 border-t border-gray-100 bg-white shadow-md">
                                {/* Single range slider for start and end */}
                                <div className="mb-4">
                                    <label className="block text-md md:text-lg text-gray-600 mb-0.5 text-center">
                                        Date Range: {format(new Date(getDateFromDays(startDays)), 'MMM d, yyyy')} -{' '}
                                        {format(new Date(getDateFromDays(endDays)), 'MMM d, yyyy')}
                                    </label>
                                    <Slider
                                        min={0}
                                        max={totalDays}
                                        value={[startDays, endDays]}
                                        onValueChange={([newStart, newEnd]) => {
                                            setStartDays(newStart)
                                            setEndDays(newEnd)
                                            onDateRangeChange({
                                                start: getStartOfDay(newStart, minDate),
                                                end: getEndOfDay(newEnd, minDate),
                                            })
                                            if (onDateQuickFilterChange) onDateQuickFilterChange('')
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                {/* Two column layout for calendars and quick buttons */}
                                <div className="flex flex-row gap-4">
                                    {/* First column: Calendars */}
                                    <div className="flex-1">
                                        <div className="scale-90 sm:scale-100 origin-top">
                                            {isSameMonth ? (
                                                <Calendar
                                                    mode="single"
                                                    selected={startDate}
                                                    onSelect={(date: Date | undefined) =>
                                                        handleCalendarSelect(date, 'start')
                                                    }
                                                    modifiers={{
                                                        range_start: startDate,
                                                        range_end: endDate,
                                                        range_middle:
                                                            startDate && endDate && startDate < endDate
                                                                ? {
                                                                      from: addDays(startDate, 1),
                                                                      to: addDays(endDate, -1),
                                                                  }
                                                                : undefined,
                                                    }}
                                                    modifiersClassNames={{
                                                        range_start: 'bg-blue-200 !text-black',
                                                        range_end: 'bg-blue-200 !text-black',
                                                        range_middle: 'bg-blue-100',
                                                    }}
                                                    fromDate={minDate}
                                                    toDate={endDate}
                                                    month={startDate ?? minDate}
                                                />
                                            ) : (
                                                <>
                                                    <div>
                                                        <Calendar
                                                            mode="single"
                                                            selected={startDate}
                                                            onSelect={(date: Date | undefined) =>
                                                                handleCalendarSelect(date, 'start')
                                                            }
                                                            modifiers={{
                                                                range_start: startDate,
                                                                range_end: endDate,
                                                                range_middle:
                                                                    startDate && endDate && startDate < endDate
                                                                        ? {
                                                                              from: addDays(startDate, 1),
                                                                              to: addDays(endDate, -1),
                                                                          }
                                                                        : undefined,
                                                            }}
                                                            modifiersClassNames={{
                                                                range_start: 'bg-blue-200 !text-black',
                                                                range_end: 'bg-blue-200 !text-black',
                                                                range_middle: 'bg-blue-100',
                                                            }}
                                                            fromDate={minDate}
                                                            toDate={endDate}
                                                            month={startDate ?? minDate}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Calendar
                                                            mode="single"
                                                            selected={endDate}
                                                            onSelect={(date: Date | undefined) =>
                                                                handleCalendarSelect(date, 'end')
                                                            }
                                                            modifiers={{
                                                                range_start: startDate,
                                                                range_end: endDate,
                                                                range_middle:
                                                                    startDate && endDate && startDate < endDate
                                                                        ? {
                                                                              from: addDays(startDate, 1),
                                                                              to: addDays(endDate, -1),
                                                                          }
                                                                        : undefined,
                                                            }}
                                                            modifiersClassNames={{
                                                                range_start: 'bg-blue-200 !text-black',
                                                                range_end: 'bg-blue-200 !text-black',
                                                                range_middle: 'bg-blue-100',
                                                            }}
                                                            fromDate={startDate}
                                                            toDate={maxDate}
                                                            month={endDate ?? maxDate}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {/* Second column: Quick buttons */}
                                    <div className="flex-1 flex flex-col items-start">
                                        <DateQuickButtons
                                            now={now}
                                            minDate={minDate}
                                            totalDays={totalDays}
                                            setStartValue={setStartDays}
                                            setEndValue={setEndDays}
                                            getDateFromDays={getDateFromDays}
                                            onDateRangeChange={onDateRangeChange}
                                            dateQuickFilterUrl={dateQuickFilterUrl}
                                            onDateQuickFilterChange={onDateQuickFilterChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
                <input
                    type="text"
                    placeholder="Search name, location, or description"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="p-1.5 border rounded flex-1  text-black min-w-0 ml-0 sm:ml-2"
                    data-testid="search-input"
                />
            </div>
        </div>
    )
}
