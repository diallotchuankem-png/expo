import * as VendoredBottomTabs from '../../react-navigation/bottom-tabs';
import * as TabsEntry from '../Tabs';

// The `expo-router/js-tabs` entry point re-exports the bottom tab building blocks (views, height
// utilities, transition presets, types) from the vendored react-navigation so apps can build a
// custom `tabBar` without depending on `@react-navigation/bottom-tabs` directly.
describe('expo-router/js-tabs re-exports', () => {
  it('re-exports every value from ../react-navigation/bottom-tabs', () => {
    const missing = Object.keys(VendoredBottomTabs).filter((key) => !(key in TabsEntry));
    expect(missing).toEqual([]);
  });

  // Apps use the `Tabs` layout instead of building a navigator themselves.
  it('does not export a bottom tab navigator factory', () => {
    expect('createBottomTabNavigator' in TabsEntry).toBe(false);
    expect('createStandardBottomTabNavigator' in TabsEntry).toBe(false);
  });

  it('still exports the Tabs navigator as a named and default export', () => {
    expect(TabsEntry.Tabs).toBeDefined();
    expect(TabsEntry.default).toBe(TabsEntry.Tabs);
  });

  it('exposes Screen and Protected on the Tabs navigator', () => {
    expect(TabsEntry.Tabs.Screen).toBeDefined();
    expect(TabsEntry.Tabs.Protected).toBeDefined();
  });
});
