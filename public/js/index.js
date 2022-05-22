const scrollToTop = ()=>{
    window.scroll({top: 0, left: 0, behavior: 'smooth'});
}
document.getElementById('back-to-top').addEventListener('click', scrollToTop)



// unique browserId
const fpPromise = import('https://openfpcdn.io/fingerprintjs/v3')
.then(FingerprintJS => FingerprintJS.load())

// Get the visitor identifier when you need it.
fpPromise
.then(fp => fp.get())
.then(result => {
  // This is the visitor identifier:
  const visitorId = result.visitorId
  console.log(visitorId)
  document.querySelectorAll('.user-cart-form').forEach(form=>{
        let action = form.getAttribute('action')
        let newAction = action+`&uniqueId=${visitorId}`
        // console.log(newAction)
        form.setAttribute('action', newAction)
  })
})
