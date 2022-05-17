module.exports = ()=>{

let headers = new Headers();
headers.append("Content-Type", "application/json");
headers.append("Authorization", "Bearer 4cU3iDtJF4OiNB59jArDSglj8sga");

fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
    method: 'POST',headers,
    body: JSON.stringify({
        "BusinessShortCode": 174379,
        "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjIwNTE3MDc1MDA4",
        "Timestamp": "20220517075008",
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 1,
        "PartyA": 254717481718,
        "PartyB": 174379,
        "PhoneNumber": 254717481718,
        "CallBackURL": "https://mydomain.com/path",
        "AccountReference": "CompanyXLTD",
        "TransactionDesc": "Payment of X" 
    })
})

  .then(response => response.text())

  .then(result => {
      console.log(result)
      return result
    
    })

  .catch(error =>{ 
      console.log(error)

    });

}

