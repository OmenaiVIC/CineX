import { TRANSITIONS, TERMINAL_STATES, ACTIVE_STATES, BOS_STATES } from './types.js';

export function createStateMachine() {
  function getNextState(currentState, action) {
    const allowed = TRANSITIONS[currentState];
    if (!allowed) return null;
    if (allowed.includes(action)) return action;
    return null;
  }

  function getTransitions(currentState) {
    return TRANSITIONS[currentState] || [];
  }

  function canTransition(from, to) {
    const allowed = TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  function isTerminal(state) {
    return TERMINAL_STATES.has(state);
  }

  function isActive(state) {
    return ACTIVE_STATES.has(state);
  }

  function getInitialState() {
    return BOS_STATES.DISBURSEMENT_INITIATED;
  }

  return {
    getNextState,
    getTransitions,
    canTransition,
    isTerminal,
    isActive,
    getInitialState,
  };
}
