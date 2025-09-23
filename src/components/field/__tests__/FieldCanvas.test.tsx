import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FieldCanvas } from '../FieldCanvas';
import React from 'react';

// Mock HTMLCanvasElement.getContext for jsdom
beforeEach(() => {
	vi.spyOn(HTMLCanvasElement.prototype as any, 'getContext').mockImplementation(() => ({}) as any);
});

// Provide SocialWeather context wrapper
vi.mock('@/components/field/contexts/SocialWeatherContext', async (importOriginal) => {
	const actual = await importOriginal<any>();
	return {
		...actual,
		useSocialWeather: () => ({ weather: { energyOffset: 0 }, setWeather: vi.fn() }),
		SocialWeatherProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	};
});

// Mock PIXI Application and its init method
const mockPixiApp = {
	init: vi.fn().mockResolvedValue(undefined),
	stage: {
		addChild: vi.fn(),
		removeAllListeners: vi.fn(),
		removeChildren: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		eventMode: 'auto',
		interactive: true,
		children: []
	},
	ticker: { stop: vi.fn() },
	destroy: vi.fn(),
	renderer: { gl: { isContextLost: () => false } },
	canvas: document.createElement('canvas')
};

// Add canvas class for tests
mockPixiApp.canvas.className = 'absolute inset-0';

// Mock PIXI Application constructor
vi.mock('pixi.js', () => ({
	Application: vi.fn(() => mockPixiApp),
	Container: vi.fn(() => ({
		addChild: vi.fn(),
		removeChild: vi.fn(),
		removeChildren: vi.fn(),
		children: []
	})),
	Graphics: vi.fn(() => ({
		clear: vi.fn(),
		beginFill: vi.fn(),
		drawCircle: vi.fn(),
		endFill: vi.fn(),
		lineStyle: vi.fn(),
		position: { set: vi.fn() },
		visible: true
	})),
	Sprite: vi.fn(),
	Texture: vi.fn(),
	Text: vi.fn()
}));

// Mock all the dependencies
const mockManager = {
	registerApp: vi.fn(),
	destroyApp: vi.fn(),
	isDestroyed: vi.fn(() => false)
};

vi.mock('@/lib/pixi/PixiLifecycleManager', () => ({
	PixiLifecycleManager: {
		getInstance: () => mockManager
	}
}));

// Mock graphics pool
vi.mock('@/lib/pixi/GraphicsPool', () => ({
	GraphicsPool: vi.fn(() => ({
		releaseAll: vi.fn(),
		acquire: vi.fn(),
		release: vi.fn()
	}))
}));

// Mock tile pool
vi.mock('@/lib/pixi/TilePool', () => ({
	TilePool: vi.fn(() => ({
		clearAll: vi.fn(),
		getTile: vi.fn(),
		releaseTile: vi.fn()
	}))
}));

vi.mock('@/hooks/useSpatialIndex', () => ({
	useSpatialIndex: () => ({ searchViewport: vi.fn() })
}));

vi.mock('@/hooks/useFieldHitTest', () => ({
	useFieldHitTest: () => vi.fn().mockResolvedValue([])
}));

vi.mock('@/hooks/useAddRipple', () => ({
	useAddRipple: () => vi.fn()
}));

vi.mock('@/hooks/location/useUnifiedLocation', () => ({
	useUnifiedLocation: () => ({ coords: null })
}));

vi.mock('@/hooks/useAdvancedHaptics', () => ({
	useAdvancedHaptics: () => ({ light: vi.fn(), medium: vi.fn() })
}));

// Mock other dependencies
vi.mock('@/utils/graphicsPool', () => ({
	GraphicsPool: vi.fn(() => ({ preAllocate: vi.fn() }))
}));

vi.mock('@/utils/tileSpritePool', () => ({
	TileSpritePool: vi.fn(() => ({ preAllocate: vi.fn() }))
}));

vi.mock('@/lib/pixi/SpritePool', () => ({
	SpritePool: vi.fn(() => ({ preAllocate: vi.fn() }))
}));

vi.mock('@/lib/geo/project', () => ({
	projectToScreen: vi.fn(),
	getMapInstance: vi.fn(() => ({
		getZoom: () => 11,
		on: vi.fn(),
		off: vi.fn()
	})),
	metersToPixelsAtLat: vi.fn(() => 10)
}));

vi.mock('@/lib/geo', () => ({
	geohashToCenter: vi.fn(() => [0, 0]),
	crowdCountToRadius: vi.fn(() => 5)
}));

vi.mock('@/lib/clusterWorker', () => ({
	clusterWorker: {
		cluster: vi.fn().mockResolvedValue([])
	}
}));

vi.mock('@/utils/timing', () => ({
	throttle: (fn: any) => Object.assign(fn, { clear: vi.fn() })
}));

describe('FieldCanvas', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render canvas container', () => {
		const { container } = render(<FieldCanvas people={[]} />);
		
		const canvas = container.querySelector('canvas');
		expect(canvas).toBeInTheDocument();
	});

	it('should initialize PIXI app on mount', async () => {
		render(<FieldCanvas people={[]} />);
		
		await waitFor(() => {
			expect(mockPixiApp.init).toHaveBeenCalledWith({
				canvas: expect.any(HTMLCanvasElement),
				width: expect.any(Number),
				height: expect.any(Number),
				backgroundColor: undefined,
				antialias: true,
				resolution: expect.any(Number),
				autoDensity: true,
				backgroundAlpha: 0
			});
		});
	});

	it('should handle PIXI initialization errors gracefully', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockPixiApp.init.mockRejectedValueOnce(new Error('PIXI init failed'));
		
		render(<FieldCanvas people={[]} />);
		
		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[FieldCanvas] PIXI init failed:',
				expect.any(Error)
			);
		});
		
		consoleErrorSpy.mockRestore();
	});

	it('should cleanup PIXI app on unmount', async () => {
		const { unmount } = render(<FieldCanvas people={[]} />);
		
		// Wait for initialization
		await waitFor(() => {
			expect(mockPixiApp.init).toHaveBeenCalled();
		});
		
		// Give a bit more time for the async initialization to complete
		await waitFor(() => {
			expect(mockManager.registerApp).toHaveBeenCalled();
		}, { timeout: 1000 });
		
		unmount();
		
		// Wait for the async cleanup (dynamic import) to complete
		await waitFor(() => {
			expect(mockManager.destroyApp).toHaveBeenCalled();
		}, { timeout: 1000 });
	});

	it('should handle fast unmount during initialization', async () => {
		const { unmount } = render(<FieldCanvas people={[]} />);
		
		// Unmount immediately before init completes
		unmount();
		
		// When unmounting before init completes, destroyApp shouldn't be called
		// because appRef.current is still null
		expect(mockManager.destroyApp).not.toHaveBeenCalled();
	});

	it('should set correct canvas attributes', () => {
		const { container } = render(<FieldCanvas people={[]} />);
		
		const canvas = container.querySelector('canvas');
		expect(canvas).toBeInTheDocument();
		expect(canvas).toHaveStyle({ 
			width: '100%', 
			height: '100%',
			display: 'block'
		});
	});

	it('should use device pixel ratio for resolution', () => {
		// Mock device pixel ratio
		Object.defineProperty(window, 'devicePixelRatio', {
			value: 2,
			writable: true
		});
		
		render(<FieldCanvas people={[]} />);
		
		expect(mockPixiApp.init).toHaveBeenCalledWith(
			expect.objectContaining({
				resolution: 2
			})
		);
	});
});