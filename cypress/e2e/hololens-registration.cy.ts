beforeEach(()=>{
  cy.visit('http://localhost:4200');
});

afterEach(()=>{
  cy.visit('http://localhost:4200');
});



it("DEVICE REGISTRATION: should display EETIMEDOUT text on errorneous registration inputs", ()=>{

  // cy.intercept({
  //   method: 'GET',
  //   url: `/register?hlHostAddress=${dummyWrongIPAddress}`,
  //   hostname:'localhost',
  //   port:3001
  // })
  // .as('registerHololens');
  // cy.wait(['@registerHololens']);
  // cy.clock();
  // cy.tick(60000);

  // console.log("IP Address: ", ipAddress);

  cy.get('[data-testid="onboard-hololens-panel-btn"]').click();
  // dummyWrongIPAddress = cy.get('[data-testid="registration-form-device-ip"]');
  cy.get('[data-testid="registration-form-device-name"]').type("Cypress Test 1");
  cy.get('[data-testid="registration-form-device-submit-btn"]').click();
  cy.get('[data-testid="toast-message"]', { timeout: 25000 }).contains("ETIMEDOUT")

});

it("DEVICE REGISTRATION: should display ENOTFOUND text on failed registration", ()=>{

  cy.get('[data-testid="onboard-hololens-panel-btn"]').click();

  cy.get('[data-testid="registration-form-device-ip"]').type('{selectall}{backspace}');
  cy.get('[data-testid="registration-form-device-ip"]').type("invalid-ip-address");
  cy.get('[data-testid="registration-form-device-name"]').type("Cypress Test 2");
  cy.get('[data-testid="registration-form-device-submit-btn"]').click();
  cy.get('[data-testid="toast-message"]',{ timeout:15000 }).contains("ENOTFOUND");

});

it("DEVICE REGISTRATION: should display SUCCESS text on successful registration", ()=>{

  cy.get('[data-testid="onboard-hololens-panel-btn"]').click();

  cy.get('[data-testid="registration-form-device-ip"]').type('{selectall}{backspace}');
  cy.get('[data-testid="registration-form-device-ip"]').type("172.16.2.138");
  cy.get('[data-testid="registration-form-device-name"]').type("Cypress Test");
  cy.get('[data-testid="registration-form-device-submit-btn"]').click();
  cy.get('[data-testid="toast-message"]',{ timeout:25000 }).should("have.text","'Cypress Test' successfully registered");

});

it("DEVICE CONFIG: Should successfully configure an existing registered device's Device Name", ()=>{

  let dummyChangedName = "Changed Name"

  // Device Registration
  cy.get('[data-testid="onboard-hololens-panel-btn"]').click();
  cy.get('[data-testid="registration-form-device-ip"]').type('{selectall}{backspace}');
  cy.get('[data-testid="registration-form-device-ip"]').type("172.16.2.138");
  cy.get('[data-testid="registration-form-device-name"]').type("Cypress Test 3");
  cy.get('[data-testid="registration-form-device-submit-btn"]').click();
  cy.get('[data-testid="toast-message"]',{ timeout:25000 }).contains("successfully registered");

  // Device Panel Overlay: Hover on device panel and click 'Settings'
  cy.get('[data-testid="device-panel"]').click();

  // Device Config: Key in new device name and click 'Save'
  cy.get('[data-testid="device-config-name-field"]').type(dummyChangedName);
  cy.get('[data-testid="device-config-save-btn"]').click();

  cy.wait(2000);

  cy.get('[data-testid="device-panel-header"]').contains(dummyChangedName);

  cy.wait(3000);

});

it("DEVICE CONFIG: 'Save' button should be disabled on missing IP Address input", ()=>{

  // Device Registration
  cy.get('[data-testid="onboard-hololens-panel-btn"]').click();
  cy.get('[data-testid="registration-form-device-ip"]').type('{selectall}{backspace}');
  cy.get('[data-testid="registration-form-device-ip"]').type("172.16.2.138");
  cy.get('[data-testid="registration-form-device-name"]').type("Cypress Test 3");
  cy.get('[data-testid="registration-form-device-submit-btn"]').click();
  // cy.get('[data-testid="toast-message"]',{ timeout:7000 }).contains("successfully registered");

  cy.wait(15000);

  // Device Panel Overlay: Hover on device panel and click 'Settings'
  cy.get('[data-testid="device-panel"]').click();
  cy.wait(1000);

  // Device Config: Key in new IP Address (1st Octet empty) and click 'Save'
  cy.get('[data-testid="device-config-ip-1-field"]').type('{selectall}{backspace}');
  // cy.get('[data-testid="device-config-ip-1-field"]').type(" ");

  cy.get('[data-testid="device-config-ip-2-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-2-field"]').type("16");

  cy.get('[data-testid="device-config-ip-3-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-3-field"]').type("2");

  cy.get('[data-testid="device-config-ip-4-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-4-field"]').type("138");
  cy.get('[data-testid="device-config-save-btn"]').should('be.disabled');

});

it("HL POWER STATUS: Hololens should be offline if IP is invalid, and online if it is valid", ()=>{

  // Device Registration
  cy.get('[data-testid="onboard-hololens-panel-btn"]').click();
  cy.get('[data-testid="registration-form-device-ip"]').type('{selectall}{backspace}');
  cy.get('[data-testid="registration-form-device-ip"]').type("172.16.2.138");
  cy.get('[data-testid="registration-form-device-name"]').type("Cypress Test 3");
  cy.get('[data-testid="registration-form-device-submit-btn"]').click();
  // cy.get('[data-testid="toast-message"]',{ timeout:7000 }).contains("successfully registered");

  cy.wait(15000);

  // Device Panel Overlay: Hover on device panel and click 'Settings'
  cy.get('[data-testid="device-panel"]').click();
  cy.wait(1000);

  // Device Config: Key in new IP Address (wrong one) and click 'Save'
  cy.get('[data-testid="device-config-ip-1-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-1-field"]').type("1");

  cy.get('[data-testid="device-config-ip-2-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-2-field"]').type("2");

  cy.get('[data-testid="device-config-ip-3-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-3-field"]').type("3");

  cy.get('[data-testid="device-config-ip-4-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-4-field"]').type("4");
  cy.get('[data-testid="device-config-save-btn"]').click();

  cy.wait(30000);

  cy.get('[data-testid="device-panel"]').click();

  cy.wait(2000);

  // Device Config: Key in new device name (correct one) and click 'Save'
  cy.get('[data-testid="device-config-ip-1-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-1-field"]').type("172");

  cy.get('[data-testid="device-config-ip-2-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-2-field"]').type("16");

  cy.get('[data-testid="device-config-ip-3-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-3-field"]').type("2");

  cy.get('[data-testid="device-config-ip-4-field"]').type('{selectall}{backspace}');
  cy.get('[data-testid="device-config-ip-4-field"]').type("138");
  cy.get('[data-testid="device-config-save-btn"]').click();

  cy.wait(30000);

  cy.get('[data-testid="device-panel-power-status"]').contains("Online");

});

