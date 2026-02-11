import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Stop } from '../types'

type StopsState = {
  items: Stop[]
}

const initialState: StopsState = {
  items: []
}

const stopsSlice = createSlice({
  name: 'stops',
  initialState,
  reducers: {
    addStopAction(state, action: PayloadAction<Stop>) {
      if (state.items.length >= 25) return
      state.items.push(action.payload)
    },

    removeStopAction(state, action: PayloadAction<string>) {
      state.items = state.items.filter(s => s.id !== action.payload)
    },

    setStopsAction(state, action: PayloadAction<Stop[]>) {
      state.items = action.payload
    },

    clearStops(state) {
      state.items = []
    },

    reorderStops(
      state,
      action: PayloadAction<{ from: number; to: number }>
    ) {
      const { from, to } = action.payload
      const arr = state.items
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
    },

    updateStopPosition(
      state,
      action: PayloadAction<{ id: string; lng: number; lat: number; address: string }>
    ) {
      const stop = state.items.find(s => s.id === action.payload.id)
      if (stop) {
        stop.lng = action.payload.lng
        stop.lat = action.payload.lat
        stop.address = action.payload.address
      }
    }
  }
})

export const {
  addStopAction,
  removeStopAction,
  setStopsAction,
  clearStops,
  reorderStops,
  updateStopPosition
} = stopsSlice.actions

export default stopsSlice.reducer
