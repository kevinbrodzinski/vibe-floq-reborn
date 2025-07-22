// Cross-platform map selector - chooses Web or Native map based on environment
import React from 'react';

// For now, we'll use WebMap only since this is a web-first project
// The platform detection can be added later when mobile support is needed
export { WebMap as BaseMap } from './WebMap';