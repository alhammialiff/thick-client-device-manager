import { HttpClient, HttpHandler } from "@angular/common/http";
import { OverviewPageComponent } from "./overview-page.component";
import { HololensAPIService } from "../services/hololens-api.service";

describe('OverviewComponent', ()=>{

  // Mounting Test
  it('can mount',()=>{

    cy.mount(OverviewPageComponent,{
      providers:[
        HololensAPIService,
        HttpClient,
        HttpHandler
      ]
    });

  });

});
