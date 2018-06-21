/*
 Copyright 2017 VMware, Inc. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
import {ComponentFixture, TestBed, async} from '@angular/core/testing';
import {ReactiveFormsModule, FormArray} from '@angular/forms';
import {ClarityModule} from '@clr/angular';
import {HttpModule} from '@angular/http';
import {CreateVchWizardService} from '../create-vch-wizard.service';
import {Observable} from 'rxjs/Observable';
import {SecurityComponent} from './security.component';
import { GlobalsService } from '../../shared';

describe('SecurityComponent', () => {

  let component: SecurityComponent;
  let fixture: ComponentFixture<SecurityComponent>;
  let service: CreateVchWizardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        HttpModule,
        ClarityModule
      ],
      providers: [
        {
          provide: CreateVchWizardService,
          useValue: {
            getUserId() {
              return Observable.of('userId');
            },
            getServerThumbprint() {
              return Observable.of('serverThumbprint');
            },
            getVcHostname() {
              return Observable.of('vcHostname');
            }
          }
        },
        {
          provide: GlobalsService,
          useValue: {
            getWebPlatform () {
              return {
                getUserSession () {
                  return {
                    serversInfo: [{
                      name: 'server.vpshere.local',
                      serviceGuid: 'aaaa-bbb-ccc',
                      thumbprint: 'AA:BB:CC'
                    }]
                  }
                }
              }
            }
          }
        }
      ],
      declarations: [
        SecurityComponent
      ]
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SecurityComponent);
    component = fixture.componentInstance;
    component.vchName = 'vch-example-name';
    component.onPageLoad();
    component.datacenter = {
      objRef: 'urn:vmomi:Datacenter:dc-test:aaaa-bbb-ccc',
      text: 'Test DC',
      nodeTypeId: 'test',
      aliases: [],
      isEmpty: false
    };

    service = fixture.debugElement.injector.get(CreateVchWizardService);
    spyOn(service, 'getUserId').and.callThrough();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should start with a invalid form',  () => {
    expect(component.form.invalid).toBe(true);
  });

  it('should return null for invalid controlName', () => {
    expect(component.addNewFormArrayEntry(null)).toBeUndefined();
    expect(component.removeFormArrayEntry(null, 0)).toBeUndefined();
  });

  it('should validate advanced fields changes', () => {
    expect(component.form.get('certificateKeySize').enabled).toBeTruthy();
  });

  it('should add and remove client certificate entries', () => {
    component.addNewFormArrayEntry('tlsCas');
    expect(component.form.get('tlsCas')['controls'].length).toBe(2);
    component.removeFormArrayEntry('tlsCas', 1);
    expect(component.form.get('tlsCas')['controls'].length).toBe(1);
    component.removeFormArrayEntry('tlsCas', 0);
    // It should not remove the last one (only its contents) so the user can add a new entry.
    expect(component.form.get('tlsCas')['controls'].length).toBe(1);
  });

  it('should set controls for server cert source - autogenerated', () => {
    component.form.get('serverCertSource').patchValue('autogenerated');
    expect(component.form.get('tlsCname').enabled).toBeTruthy();
    expect(component.form.get('certificateKeySize').enabled).toBeTruthy();
    expect(component.form.get('tlsServerCert').enabled).toBeFalsy();
    expect(component.form.get('tlsServerKey').enabled).toBeFalsy();
  });

  it('should set controls for server cert source - existing', () => {
    component.form.get('serverCertSource').patchValue('existing');
    expect(component.form.get('tlsCname').enabled).toBeFalsy();
    expect(component.form.get('certificateKeySize').enabled).toBeFalsy();
    expect(component.form.get('tlsServerCert').enabled).toBeTruthy();
    expect(component.form.get('tlsServerKey').enabled).toBeTruthy();
  });

  it('should enable tlsCas for useClientAuth - true ', () => {
    component.form.get('useClientAuth').patchValue(true);
    expect(component.form.get('tlsCas').enabled).toBeTruthy();
  });

  it('should enable tlsCas for useClientAuth - false ', () => {
    component.form.get('useClientAuth').patchValue(false);
    expect(component.form.get('tlsCas').enabled).toBeFalsy();
  });

  it('should generate security results as expected for serverCertSource - autogenerated', async(() => {
    component.form.get('serverCertSource').patchValue('autogenerated');
    component.form.get('organization').patchValue('VMware');
    component.form.get('tlsCname').patchValue('vch-1');
    component.form.get('certificateKeySize').patchValue(2048);
    component.form.get('useClientAuth').patchValue(false);

    component.onCommit().subscribe(results => {
      expect(results.security['tlsCname']).toEqual('vch-1');
      expect(results.security['organization']).toEqual('VMware');
      expect(results.security['certificateKeySize']).toEqual(2048);
    });
  }));

  it('should generate security results as expected for serverCertSource - existing', async(() => {
    component.tlsServerCertContents = {
      name: 'filenameForCert',
      content: 'content',
      expires: 'expires'
    };

    component.tlsServerKeyContents = {
      name: 'filenameForKey',
      content: 'content',
      expires: 'expires'
    };

    component.form.get('serverCertSource').patchValue('existing');
    component.onCommit().subscribe(results => {
      expect(results.security['tlsServerCert']['name']).toBe('filenameForCert');
      expect(results.security['tlsServerKey']['name']).toBe('filenameForKey');
      expect(results.security['tlsServerCert']['content']).toBe('content');
      expect(results.security['tlsServerCert']['expires']).toBe('expires');
    });
  }));

  it('should clear tlsCaError after calling clearFileReaderError()', async(() => {
    component.tlsCaError = 'error';
    component.clearFileReaderError();
    expect(component.tlsCaError).toBeNull();
    expect(component.tlsServerError).toBeNull();
  }));

  it('should handle adding a correctly formatted TLS Server Cert', () => {
    const evt = new Event('change');
    const certContent = `-----BEGIN CERTIFICATE-----
MIICEjCCAXsCAg36MA0GCSqGSIb3DQEBBQUAMIGbMQswCQYDVQQGEwJKUDEOMAwG
A1UECBMFVG9reW8xEDAOBgNVBAcTB0NodW8ta3UxETAPBgNVBAoTCEZyYW5rNERE
MRgwFgYDVQQLEw9XZWJDZXJ0IFN1cHBvcnQxGDAWBgNVBAMTD0ZyYW5rNEREIFdl
YiBDQTEjMCEGCSqGSIb3DQEJARYUc3VwcG9ydEBmcmFuazRkZC5jb20wHhcNMTIw
ODIyMDUyNjU0WhcNMTcwODIxMDUyNjU0WjBKMQswCQYDVQQGEwJKUDEOMAwGA1UE
CAwFVG9reW8xETAPBgNVBAoMCEZyYW5rNEREMRgwFgYDVQQDDA93d3cuZXhhbXBs
ZS5jb20wXDANBgkqhkiG9w0BAQEFAANLADBIAkEAm/xmkHmEQrurE/0re/jeFRLl
8ZPjBop7uLHhnia7lQG/5zDtZIUC3RVpqDSwBuw/NTweGyuP+o8AG98HxqxTBwID
AQABMA0GCSqGSIb3DQEBBQUAA4GBABS2TLuBeTPmcaTaUW/LCB2NYOy8GMdzR1mx
8iBIu2H6/E2tiY3RIevV2OW61qY2/XRQg7YPxx3ffeUugX9F4J/iPnnu1zAxxyBy
2VguKv4SWjRFoRkIfIlHX0qVviMhSlNy2ioFLy7JcPZb+v3ftDGywUqcBiVDoea0
Hn+GmxZA
-----END CERTIFICATE-----`;
    spyOnProperty(evt, 'target', 'get').and.returnValue({
      files: [
        new File([certContent], 'foo.txt', { type: 'text/plain' })
      ]
    });

    component.addFileContent(evt, 'tlsServerCert', 0, true);
    expect(component.tlsServerError).toBeNull();
  });

  it('should handle a malformatted TLS Server Cert correctly', () => {
    const evt = new Event('change');
    const certContent = `oops!`;
    spyOnProperty(evt, 'target', 'get').and.returnValue({
      files: [
        new File([certContent], 'foo.txt', { type: 'text/plain' })
      ]
    });

    component.addFileContent(evt, 'tlsServerCert', 0, true);
  });

  it('should handle adding a correctly formatted TLS Server Key', () => {
    const evt = new Event('change');
    const keyContent = `-----BEGIN PRIVATE KEY-----
MIIBUwIBADANBgkqhkiG9w0BAQEFAASCAT0wggE5AgEAAkEAlcIDtrVom915ITL4
tPi5b5w/jQi2zQwRLyyIRdsfdGdDQTcUxPdh2dMioHH4Ap5kkYiNvOO2RjdgyTTV
iyy4fwIDAQABAkAZGN2Udgxk6pXNKYSil3hEKxQ/Z3FzJY2PsU/ZHSLFV/JNWaFH
jVNu9dQvmLOo7p5puUDi5Whszr8jTE1caVHBAiEA59ksZnb8ZI/MfZZh8K4v/Z1+
mBRwvA6KRAvzhK7h6l8CIQClW7CN+JwTlsaKzprHlsLvWR0JBiqwgpwfF6jWhQIl
4QIgRKUcbEoWeH/K//Qik2w/cUvMS6LhrgxwC62uMD7HTOkCIGsx7lmKwfs88gaH
+vTKOiKZXWY9Ni1o7jaFyvEOFp9hAiAjvMqapHnolq4NDPx+h2fpYKMgCs6ujCsv
zSyXyEl4rw==
-----END PRIVATE KEY-----`;
    spyOnProperty(evt, 'target', 'get').and.returnValue({
      files: [
        new File([keyContent], 'foo.txt', { type: 'text/plain' })
      ]
    });

    component.addFileContent(evt, 'tlsServerKey', 0, true);
    expect(component.tlsServerError).toBeNull();
  });

  it('should handle a malformatted TLS Server Key correctly', () => {
    const evt = new Event('change');
    const certContent = `oops!`;
    spyOnProperty(evt, 'target', 'get').and.returnValue({
      files: [
        new File([certContent], 'foo.txt', { type: 'text/plain' })
      ]
    });

    component.addFileContent(evt, 'tlsServerKey', 0, true);
  });

  it('should handle adding a correctly formatted TLS Client Cert', () => {
    const evt = new Event('change');
    const certContent = `-----BEGIN CERTIFICATE-----
MIICEjCCAXsCAg36MA0GCSqGSIb3DQEBBQUAMIGbMQswCQYDVQQGEwJKUDEOMAwG
A1UECBMFVG9reW8xEDAOBgNVBAcTB0NodW8ta3UxETAPBgNVBAoTCEZyYW5rNERE
MRgwFgYDVQQLEw9XZWJDZXJ0IFN1cHBvcnQxGDAWBgNVBAMTD0ZyYW5rNEREIFdl
YiBDQTEjMCEGCSqGSIb3DQEJARYUc3VwcG9ydEBmcmFuazRkZC5jb20wHhcNMTIw
ODIyMDUyNjU0WhcNMTcwODIxMDUyNjU0WjBKMQswCQYDVQQGEwJKUDEOMAwGA1UE
CAwFVG9reW8xETAPBgNVBAoMCEZyYW5rNEREMRgwFgYDVQQDDA93d3cuZXhhbXBs
ZS5jb20wXDANBgkqhkiG9w0BAQEFAANLADBIAkEAm/xmkHmEQrurE/0re/jeFRLl
8ZPjBop7uLHhnia7lQG/5zDtZIUC3RVpqDSwBuw/NTweGyuP+o8AG98HxqxTBwID
AQABMA0GCSqGSIb3DQEBBQUAA4GBABS2TLuBeTPmcaTaUW/LCB2NYOy8GMdzR1mx
8iBIu2H6/E2tiY3RIevV2OW61qY2/XRQg7YPxx3ffeUugX9F4J/iPnnu1zAxxyBy
2VguKv4SWjRFoRkIfIlHX0qVviMhSlNy2ioFLy7JcPZb+v3ftDGywUqcBiVDoea0
Hn+GmxZA
-----END CERTIFICATE-----`;
    spyOnProperty(evt, 'target', 'get').and.returnValue({
      files: [
        new File([certContent], 'foo.txt', { type: 'text/plain' })
      ]
    });

    component.addFileContent(evt, 'tlsCas', 0, true);
    expect(component.tlsServerError).toBeNull();
  });

  it('should handle adding a malformatted TLS Client Cert correctly', () => {
    const evt = new Event('change');
    const certContent = `oops!`;
    spyOnProperty(evt, 'target', 'get').and.returnValue({
      files: [
        new File([certContent], 'foo.txt', { type: 'text/plain' })
      ]
    });

    component.addFileContent(evt, 'tlsCas', 0, true);
  });

  it('should handle an incorrect file event for addFileContent()', () => {
    const evt = new Event('change');
    spyOnProperty(evt, 'target', 'get').and.returnValue({
      files: []
    });

    try {
      component.addFileContent(evt, 'tlsCas', 0, true);
    } catch (e) {
      expect(component.tlsCaError).toBe('Failed to load client certificate PEM file!');
    }

    try {
      component.addFileContent(evt, 'tlsServerCert', 0, true);
    } catch (e) {
      expect(component.tlsServerError).toBe('Failed to load server certificate PEM file!');
    }

    try {
      component.addFileContent(evt, 'tlsServerKey', 0, true);
    } catch (e) {
      expect(component.tlsServerError).toBe('Failed to load server private key PEM file!');
    }
  });
});