'use client'

import React from 'react'

interface ErrorMessageProps {
    message: string
    className?: string
    onRetry?: () => void
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
    message,
    className = '',
    onRetry,
}) => {
    return (
        <div
            className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}
        >
            <div className="flex">
                <div className="flex-shrink-0">
                    <svg
                        className="h-5 w-5 text-error"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                        <p>{message}</p>
                    </div>
                    {onRetry && (
                        <div className="mt-4">
                            <button
                                type="button"
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                onClick={onRetry}
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ErrorMessage
