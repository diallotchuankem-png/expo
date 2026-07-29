'use client';
// TODO: Rename this file to `createStandardBottomTabNavigator.tsx` in a follow-up.
import { createStandardNavigator } from 'standard-navigation';

import type { NavigatorContentProps } from '../../../standard-navigation/types';
import type { Href } from '../../../types';
import type {
  BottomTabDescriptorMap,
  BottomTabEmit,
  BottomTabNavigationConfig,
  BottomTabNavigationEventMap,
  BottomTabNavigationOptions,
} from '../types';
import { BottomTabView } from '../views/BottomTabView';

/**
 * Screen options of the `Tabs` layout: the bottom tab options plus the `href` shortcut, which the
 * layout rewrites into a tab bar button before the screens are rendered.
 */
export type TabsScreenOptions = BottomTabNavigationOptions & { href?: Href | null };

/**
 * The standard contract requires `canPreventDefault` on every event, while the react-navigation
 * event map declares it on `tabPress` only.
 */
export type StandardBottomTabNavigationEventMap = {
  [Event in keyof BottomTabNavigationEventMap]: BottomTabNavigationEventMap[Event] & {
    canPreventDefault: Event extends 'tabPress' ? true : false;
  };
};

/**
 * Router-specific values the views need that the standard `state` and `actions` do not carry.
 */
export interface BottomTabNavigatorCreateProps {
  preloadedRouteKeys: string[];
  popNestedStackToTop: (routeKey: string) => void;
}

export type BottomTabNavigatorContentProps = BottomTabNavigationConfig &
  BottomTabNavigatorCreateProps;

type ContentArgs = NavigatorContentProps<
  TabsScreenOptions,
  StandardBottomTabNavigationEventMap,
  BottomTabNavigationConfig,
  BottomTabNavigatorCreateProps
>;

function BottomTabNavigatorContent({
  state,
  descriptors,
  actions,
  emitter,
  tabBar,
  safeAreaInsets,
  detachInactiveScreens,
  preloadedRouteKeys,
  popNestedStackToTop,
}: ContentArgs) {
  return (
    <BottomTabView
      state={state}
      // TODO(@ubax): SDK-58: Try to remove the casting from here to ensure type safety
      // Integration supplies full descriptors, including preload placeholders; standard types omit route/navigation.
      descriptors={descriptors as unknown as BottomTabDescriptorMap}
      // The cast is what keeps `defaultPrevented` required on `BottomTabEmit`, so a custom tab bar
      // can rely on it. TypeScript instantiates the generic `emit` with `EventName = any` here,
      // which collapses the conditional that adds `defaultPrevented` to its return type. The
      // property is present at runtime for `tabPress` — `useStandardEmitter` defines it as a getter.
      emit={emitter.emit as BottomTabEmit}
      navigateToTab={actions.navigate}
      preloadedRouteKeys={preloadedRouteKeys}
      popNestedStackToTop={popNestedStackToTop}
      tabBar={tabBar}
      safeAreaInsets={safeAreaInsets}
      detachInactiveScreens={detachInactiveScreens}
    />
  );
}

export const createStandardBottomTabNavigator = createStandardNavigator<
  TabsScreenOptions,
  StandardBottomTabNavigationEventMap,
  BottomTabNavigatorContentProps
>(BottomTabNavigatorContent);
