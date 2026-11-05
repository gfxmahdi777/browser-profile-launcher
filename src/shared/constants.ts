import { BrowserDefinition } from './types.ts';

export const SUPPORTED_BROWSERS: BrowserDefinition[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    processExe: 'chrome.exe',
    localStateSubpath: 'Google/Chrome/User Data/Local State',
    userDataSubpath: 'Google/Chrome/User Data',
    registryAppPathKey: 'chrome.exe',
    brandColor: '#4285F4',
    standardExePaths: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
    ],
  },
  {
    id: 'brave',
    name: 'Brave Browser',
    processExe: 'brave.exe',
    localStateSubpath: 'BraveSoftware/Brave-Browser/User Data/Local State',
    userDataSubpath: 'BraveSoftware/Brave-Browser/User Data',
    registryAppPathKey: 'brave.exe',
    brandColor: '#FB542B',
    standardExePaths: [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    ],
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    processExe: 'msedge.exe',
    localStateSubpath: 'Microsoft/Edge/User Data/Local State',
    userDataSubpath: 'Microsoft/Edge/User Data',
    registryAppPathKey: 'msedge.exe',
    brandColor: '#0078D7',
    standardExePaths: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '%LOCALAPPDATA%\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    processExe: 'vivaldi.exe',
    localStateSubpath: 'Vivaldi/User Data/Local State',
    userDataSubpath: 'Vivaldi/User Data',
    registryAppPathKey: 'vivaldi.exe',
    brandColor: '#EF3939',
    standardExePaths: [
      '%LOCALAPPDATA%\\Vivaldi\\Application\\vivaldi.exe',
      'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe',
      'C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe',
    ],
  },
];

import type { AppSettings, BrowserId } from './types.ts';

export const DEFAULT_SETTINGS: AppSettings = {
  startWithWindows: false,
  theme: 'dark',
  language: 'en',
  customGroups: ['Facebook', 'Work', 'Personal'],
  profiles: {},
};

export function getProfileKey(browserId: BrowserId, folderName: string): string {
  return `${browserId}:${folderName}`;
}

