'use client'

import { format } from 'date-fns'

interface DateQuickButtonsProps {
    now: Date
    minDate: Date
    totalDays: number
    setStartValue: (value: number) => void
    setEndValue: (value: number) => void
    getDateFromValue: (value: number) => string
    onDateRangeChange: (range: { start: string; end: string }) => void
}

export default function DateQuickButtons({
    now,
    minDate,
    totalDays,
    setStartValue,
    setEndValue,
    getDateFromValue,
    onDateRangeChange,
}: DateQuickButtonsProps) {
    // Get today's value in slider units
    const getTodayValue = () => {
        return Math.floor((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate today's value once to avoid repetition
    const todayValue = getTodayValue()

    // Common button style
    const buttonClass = 'text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded'

    return (
        <div className="mt-3 flex flex-wrap gap-1 justify-between">
            <button
                data-umami-event="DateQuickButton"
                data-umami-event-dateqbtn="Past"
                onClick={() => {
                    // Past: start slider as far back as can go, end slider to today
                    setStartValue(0)
                    setEndValue(todayValue)
                    onDateRangeChange({
                        start: getDateFromValue(0),
                        end: getDateFromValue(todayValue),
                    })
                }}
                className={buttonClass}
            >
                Past
            </button>
            <button
                data-umami-event="DateQuickButton"
                data-umami-event-dateqbtn="Future"
                onClick={() => {
                    // Future: start slider to today, end slider as far forward as can go
                    setStartValue(todayValue)
                    setEndValue(totalDays)
                    onDateRangeChange({
                        start: getDateFromValue(todayValue),
                        end: getDateFromValue(totalDays),
                    })
                }}
                className={buttonClass}
            >
                Future
            </button>
            <button
                data-umami-event="DateQuickButton"
                data-umami-event-dateqbtn="Next3Days"
                onClick={() => {
                    // Next 3 days: start slider to today, end slider to be 3 days from today
                    const threeDaysLaterValue = Math.min(todayValue + 3, totalDays)
                    setStartValue(todayValue)
                    setEndValue(threeDaysLaterValue)
                    onDateRangeChange({
                        start: getDateFromValue(todayValue),
                        end: getDateFromValue(threeDaysLaterValue),
                    })
                }}
                className={buttonClass}
            >
                Next 3 days
            </button>
            <button
                data-umami-event="DateQuickButton"
                data-umami-event-dateqbtn="Weekend"
                onClick={() => {
                    // Weekend: start slider to a future Friday (or today if today is Friday or Saturday),
                    // end slider to Sunday after Friday

                    // Get today's day of week (0 = Sunday, 6 = Saturday)
                    const today = new Date(getDateFromValue(todayValue))
                    const dayOfWeek = today.getDay()

                    // Calculate days until Friday (if today is Sun-Thu) or use today (if Fri-Sat)
                    let daysToFriday = 0
                    if (dayOfWeek === 0) {
                        // Sunday
                        daysToFriday = 5
                    } else if (dayOfWeek < 5) {
                        // Monday-Thursday
                        daysToFriday = 5 - dayOfWeek
                    } // Friday-Saturday: use today

                    const fridayValue = Math.min(todayValue + daysToFriday, totalDays)

                    // Sunday is 2 days after Friday
                    const sundayValue = Math.min(fridayValue + 2, totalDays)

                    setStartValue(fridayValue)
                    setEndValue(sundayValue)
                    onDateRangeChange({
                        start: getDateFromValue(fridayValue),
                        end: getDateFromValue(sundayValue),
                    })
                }}
                className={buttonClass}
            >
                Weekend
            </button>
            <button
                data-umami-event="DateQuickButton"
                data-umami-event-dateqbtn="Today"
                onClick={() => {
                    // Today: both sliders set to today
                    setStartValue(todayValue)
                    setEndValue(todayValue)
                    onDateRangeChange({
                        start: getDateFromValue(todayValue),
                        end: getDateFromValue(todayValue),
                    })
                }}
                className={buttonClass}
            >
                Today
            </button>
        </div>
    )
}
