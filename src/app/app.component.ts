import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import {map} from 'rxjs/operators';
import {Product} from './model/products';
import {User}    from './model/users';
import {POItem} from './model/poitem';
import {read, utils, writeFile} from 'xlsx';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit{

  allPOItems: any[] = [];// for fetching existing
  newPOItems: any[] = [];// for delta 
  allItems: any[] = [];

  title = 'PurchaseOrder';
  csvRecords: any;

  allProducts : Product[] = [];
  users: any[] = [];

  public operationResult;

  //currentDate : Date = new Date();//
  dateStr = new Date().toISOString().split('T')[0];
  constructor(private http : HttpClient){  }

csvImport($event: any){
  console.log('dateStr', this.dateStr);
  //console.log('currentDate with formate', this.currentDate.toISOString().split('T')[0]);
    const files = $event.target.files;
    if (files.length){
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const wb = read(event.target.result);
        const sheets = wb.SheetNames;

        if (sheets.length){
          const rows = utils.sheet_to_json(wb.Sheets[sheets[0]]);
          this.allItems = rows;
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  csvExport(){
    console.log('csvExport');
    const headings = [['id', 'date', 'Vendor', 'Model', 'unitPrice', 'quantity']];
    const wb = utils.book_new();
    const ws: any = utils.json_to_sheet([]);
    utils.sheet_add_aoa(ws, headings);
    console.log('this.users:',this.users);
    console.log('allPOItems---:',this.allPOItems);
    utils.sheet_add_json(ws, this.allPOItems, {
      origin:'A2',
      skipHeader: true,
    });
    utils.book_append_sheet(wb, ws, 'POItems');
    writeFile(wb, 'POItems Report.xlsx');
  }

  onPOItemBulkCreate(formValue: string){
    console.log('onPOItemBulkCreate--formValue: ', formValue);
    console.log('onPOItemBulkCreate--formValue.vendorName: ', formValue["vendorName"]);
    for (let i = 0; i < this.allItems.length; i++){
      const poitem : POItem = {
        dateStr : new Date().toISOString().split('T')[0],
        vendorName: formValue["vendorName"],
        modelName : this.allItems[i].modelName,
        unitPrice : this.allItems[i].unitPrice,
        quantity : this.allItems[i].quantity
      };
      this.newPOItems.push(poitem);
    }
    console.log('Going to generate new POItems===', this.newPOItems);

    this.http.post<{name: string}>('/poitem/batch',
    this.newPOItems)
    .subscribe((res) => {
      console.log('the new Generated===', res);
      console.log('the new Generated==res==', res["result"]);
      if (res["result"]=== 'success'){
        this.operationResult = "SUCCESS on inserting PO info!";
      } else {
        this.operationResult = "FAILURE on PO info inseration! " + res["result"];
      }
      console.log('this.operationResult--', this.operationResult);
    });
    this.newPOItems = [];// need to manually reset it to empty;
    console.log('after reseting newPOItems===', this.newPOItems);
    this.fetchPOItems();// auto fetch the latest list
  }

  ngOnInit(){
    //this.fetchProducts();
    this.fetchPOItems();
  }

  onProductsFetch(){
    this.fetchProducts();
  }
 
  onPOItemsFetch(){
    this.fetchPOItems();
  }

  fetchPOItems(){
    this.http.get<POItem[]>('/poitem/all')
    .subscribe((items)=> {
      console.log('Fetching all existing POItems ---', items);
      this.allPOItems = items
    });
  }
 
  onUserCreate2(users: {name: string, id: number}){
    console.log('onUserCreate2-',users);
    this.http.post('/user/generate', //without return type  this.http.post<{name: string}>
    users)
    .subscribe((user) => {
      console.log('onUserCreate2-', user);
    });
  }
  onUserCreate(users: {name: string, id: number}){
    console.log('onUserCreate-',users);
    this.http.post<{name: string}>('/user', //With return type  this.http.post<{name: string}>
    users)
    .subscribe((user) => {
      console.log('onUserCreate-',user);
    });
  }

  //persist on external DB
  onProductCreate(products: {pName: string, desc: string, price : string}){
    console.log(products);
    const headers = new HttpHeaders({'myHeader':'lxd'});
    this.http.post<{name: string}>('https://angulartest-5e69f-default-rtdb.firebaseio.com/products.json',
    products, {headers: headers})
    .subscribe((res) => {
      console.log(res);
    });
  }
  private fetchProducts(){
    this.http.get<{[key: string]: Product}>('https://angulartest-5e69f-default-rtdb.firebaseio.com/products.json')
    .pipe(map((res)=>{
      console.log(res);
      const products = [];
      for (const key in res){
        console.log('key:', key);
        if (res.hasOwnProperty(key)){
          products.push({...res[key], id: key})
        }
      }
      return products;
    }))
    .subscribe((products)=>{
      console.log('fetchProducts====', products);
      this.allProducts = products;
    });
  }

}