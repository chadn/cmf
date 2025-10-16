'use client'

import { Suspense } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import ActiveFilters from '@/components/events/ActiveFilters'
import DateAndSearchFilters from '@/components/events/DateAndSearchFilters'
import ErrorMessage from '@/components/common/ErrorMessage'
import EventList from '@/components/events/EventList'
import EventsSourceSelector from '@/components/home/EventsSourceSelector'
import Footer from '@/components/layout/Footer'
import MapContainer from '@/components/map/MapContainer'
import Sidebar from '@/components/layout/Sidebar'
import { CmfEvent, CmfEvents, EventsSource } from '@/types/events'
import { useAppController } from '@/lib/hooks/useAppController'

declare global {
    interface Window {
        cmfEvents: CmfEvents
        cmfEventSources: Array<EventsSource> | null
        cmfEventSelected: CmfEvent | null | undefined
    }
}

function HomeContent() {
    // Smart Hook / Dumb Component Architecture - All business logic in useAppController
    const { state, eventData, mapData, handlers, hasEventSource } = useAppController()

    // If no eventSourceId is provided, show the eventSource selector
    if (!hasEventSource) {
        return (
            <div className="min-h-screen flex flex-col">
                <main className="flex-grow flex items-center justify-center">
                    <EventsSourceSelector />
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            <main className="h-screen">
                <PanelGroup direction={state.isDesktop ? 'horizontal' : 'vertical'} className="h-full w-full">
                    <Panel minSize={20} maxSize={80} defaultSize={state.split[0]}>
                        <Sidebar
                            headerName={state.headerName}
                            eventCount={{
                                shown: eventData.cmfEvents.visibleEvents.length,
                                total: eventData.cmfEvents.allEvents.length,
                            }}
                            eventSources={eventData.eventSources}
                            onResetMapToVisibleEvents={handlers.onResetMapToVisibleEvents}
                            llzChecked={mapData.llzChecked}
                            onLlzCheckedChange={handlers.onLlzCheckedChange}
                            preferQfChecked={mapData.preferQfChecked}
                            onPreferQfCheckedChange={handlers.onPreferQfCheckedChange}
                            currentUrlState={state.currentUrlState}
                            className="h-full"
                        >
                            <ActiveFilters
                                cmfEvents={eventData.cmfEvents}
                                onClearMapFilter={handlers.onClearMapFilter}
                                onClearSearchFilter={handlers.onClearSearchFilter}
                                onClearDateFilter={handlers.onClearDateFilter}
                            />
                            <DateAndSearchFilters
                                urlState={state.currentUrlState}
                                onSearchChange={handlers.onSearchChange}
                                onDateRangeChange={handlers.onDateRangeChange}
                                onDateQuickFilterChange={handlers.onDateQuickFilterChange}
                                dateConfig={state.dateConfig}
                            />
                            {eventData.apiError ? (
                                <div className="p-4">
                                    <ErrorMessage message={eventData.apiError.message} className="mb-4" />
                                </div>
                            ) : (
                                <EventList
                                    cmfEvents={eventData.cmfEvents}
                                    selectedEventId={state.currentUrlState.se}
                                    onEventSelect={handlers.onEventSelect}
                                    apiIsLoading={eventData.apiIsLoading}
                                />
                            )}
                        </Sidebar>
                    </Panel>
                    <PanelResizeHandle
                        className={
                            state.isDesktop ? 'bg-gray-200 w-2 cursor-col-resize' : 'bg-gray-200 h-2 cursor-row-resize'
                        }
                    />
                    <Panel minSize={20} maxSize={80} defaultSize={state.split[1]}>
                        <div className="h-full w-full">
                            <MapContainer
                                viewport={mapData.viewport}
                                onViewportChange={handlers.onViewportChange}
                                markers={mapData.markers}
                                selectedMarkerId={mapData.selectedMarkerId}
                                onMarkerSelect={handlers.onMarkerSelect}
                                onBoundsChange={handlers.onBoundsChange}
                                onWidthHeightChange={handlers.onWidthHeightChange}
                                selectedEventId={state.currentUrlState.se}
                                onEventSelect={handlers.onEventSelect}
                                eventSources={eventData.eventSources || undefined}
                            />
                        </div>
                    </Panel>
                </PanelGroup>
            </main>
        </div>
    )
}

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HomeContent />
        </Suspense>
    )
}
