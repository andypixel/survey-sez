import React, { createContext, useContext } from 'react';

/**
 * Context for providing workflow instances to components
 * Replaces global window access pattern with proper React Context
 */
const WorkflowContext = createContext();

/**
 * Provider component that makes workflows available to child components
 */
export function WorkflowProvider({ children, workflows }) {
  return (
    <WorkflowContext.Provider value={workflows}>
      {children}
    </WorkflowContext.Provider>
  );
}

/**
 * Hook to access workflows in components
 * @returns {Object} Object containing all workflow instances
 */
export function useWorkflows() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflows must be used within a WorkflowProvider');
  }
  return context;
}

export default WorkflowContext;