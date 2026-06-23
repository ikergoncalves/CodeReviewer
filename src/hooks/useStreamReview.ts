import { useCallback, useState } from 'react'
import { requestReview, type ReviewRequest } from '@/api/review'
import type { ReviewResult } from '@/lib/types'

interface StreamReviewState {
  result: ReviewResult | null
  isLoading: boolean
  error: string | null
}

const initialState: StreamReviewState = {
  result: null,
  isLoading: false,
  error: null,
}

/**
 * Hook that drives a code review request and exposes its state.
 * Streaming support will be layered on top of this in a later iteration.
 */
export function useStreamReview() {
  const [state, setState] = useState<StreamReviewState>(initialState)

  const review = useCallback(async (payload: ReviewRequest) => {
    setState({ result: null, isLoading: true, error: null })
    try {
      const result = await requestReview(payload)
      setState({ result, isLoading: false, error: null })
    } catch (error) {
      setState({
        result: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [])

  return { ...state, review }
}
