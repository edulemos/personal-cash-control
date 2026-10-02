import { describe, it, expect } from 'vitest';
import gdriveService from '../../src/main/services/gdrive.service';

describe('GDriveService - Scopes and Permissions', () => {
  it('should return false if token is null or undefined', () => {
    expect(gdriveService.hasDriveScope(null)).toBe(false);
    expect(gdriveService.hasDriveScope(undefined)).toBe(false);
  });

  it('should return false if token scope does not include drive permissions', () => {
    const userOnlyToken = {
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid'
    };
    expect(gdriveService.hasDriveScope(userOnlyToken)).toBe(false);
  });

  it('should return true if token scope includes drive.file permission', () => {
    const driveFileToken = {
      scope: 'https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/drive.file'
    };
    expect(gdriveService.hasDriveScope(driveFileToken)).toBe(true);
  });

  it('should return true if token scope includes full drive permission', () => {
    const fullDriveToken = {
      scope: 'https://www.googleapis.com/auth/drive openid'
    };
    expect(gdriveService.hasDriveScope(fullDriveToken)).toBe(true);
  });

  it('should return true if token scope includes drive.appdata permission', () => {
    const appDataToken = {
      scope: 'https://www.googleapis.com/auth/drive.appdata openid'
    };
    expect(gdriveService.hasDriveScope(appDataToken)).toBe(true);
  });
});
