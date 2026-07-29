'use client';
import { useCallback } from 'react';

import {
  CommonActions,
  createNavigatorFactory,
  type NavigatorTypeBagBase,
  type ParamListBase,
  StackActions,
  type TabActionHelpers,
  type TabNavigationState,
  TabRouter,
  type TabRouterOptions,
  type TypedNavigator,
  useNavigationBuilder,
} from '../../native';
import type {
  BottomTabEmit,
  BottomTabNavigationEventMap,
  BottomTabNavigationOptions,
  BottomTabNavigationProp,
  BottomTabNavigatorProps,
} from '../types';
import { BottomTabView } from '../views/BottomTabView';

function BottomTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
  UNSTABLE_router,
  ...rest
}: BottomTabNavigatorProps) {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    BottomTabNavigationOptions,
    BottomTabNavigationEventMap
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
    UNSTABLE_router,
  });

  // The views take discrete props instead of `navigation` and the raw state, so this factory adapts
  // its `useNavigationBuilder` results to them.
  const navigateToTab = useCallback(
    (name: string, params?: object) => {
      navigation.dispatch({ ...CommonActions.navigate(name, params), target: state.key });
    },
    [navigation, state.key]
  );

  const popNestedStackToTop = useCallback(
    (routeKey: string) => {
      const nestedState = state.routes.find((route) => route.key === routeKey)?.state;
      if (nestedState?.type === 'stack' && nestedState.key) {
        navigation.dispatch({ ...StackActions.popToTop(), target: nestedState.key });
      }
    },
    [navigation, state.routes]
  );

  return (
    <NavigationContent>
      <BottomTabView
        {...rest}
        state={state}
        descriptors={descriptors}
        // The cast is what keeps `defaultPrevented` required on `BottomTabEmit`, so a custom tab bar
        // can rely on it. TypeScript instantiates the generic `emit` with `EventName = any` here,
        // which collapses the conditional that adds `defaultPrevented` to its return type. The
        // property is present at runtime for `tabPress`.
        emit={navigation.emit as BottomTabEmit}
        navigateToTab={navigateToTab}
        preloadedRouteKeys={state.preloadedRouteKeys}
        popNestedStackToTop={popNestedStackToTop}
      />
    </NavigationContent>
  );
}

export function createBottomTabNavigator<
  const ParamList extends ParamListBase,
  const NavigatorID extends string | undefined = string | undefined,
  const TypeBag extends NavigatorTypeBagBase = {
    ParamList: ParamList;
    NavigatorID: NavigatorID;
    State: TabNavigationState<ParamList>;
    ScreenOptions: BottomTabNavigationOptions;
    EventMap: BottomTabNavigationEventMap;
    NavigationList: {
      [RouteName in keyof ParamList]: BottomTabNavigationProp<ParamList, RouteName, NavigatorID>;
    };
    Navigator: typeof BottomTabNavigator;
  },
>(): TypedNavigator<TypeBag> {
  return createNavigatorFactory(BottomTabNavigator)();
}
