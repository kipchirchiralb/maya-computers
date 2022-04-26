const scrollToTop = ()=>{
    window.scroll({top: 0, left: 0, behavior: 'smooth'});
}
document.getElementById('back-to-top').addEventListener('click', scrollToTop)
let scrollPos
window.addEventListener('scroll',() => {
    scrollPos = window.scrollTop
    localStorage.setItem("scrollPos", scrollPos)
})
document.addEventListener("DOMContentLoaded", (e) => {
    scrollPos = localStorage.getItem("scrollPos")
    window.scrollTo(0, scrollPos)
})
