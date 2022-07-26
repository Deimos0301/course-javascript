import InteractiveMap from './interactiveMap.js';

export default class GeoReview {
  constructor() {
    this.formTemplate = document.querySelector('#addFormTemplate').innerHTML;
    this.map = new InteractiveMap('map', this.onClick.bind(this));
    this.map.init().then(this.onInit.bind(this));
  }

  onInit() {
    document.body.addEventListener('click', this.onDocumentClick.bind(this));
    for (let i = 0; i < sessionStorage.length; i++) {
      try {
        let coords = JSON.parse(sessionStorage.key(i));
        for (const review of JSON.parse(sessionStorage.getItem(sessionStorage.key(i)))) {
          this.map.createPlacemark(coords);
        }
      }
      catch {
      }
    }
  }

  setData() {
    document.querySelector('[data-role=review-name').value;
    document.querySelector('[data-role=review-place').value;
    document.querySelector('[data-role=review-text').value;
  }

  onClick(coords) {
    let reviews = JSON.parse(sessionStorage.getItem(JSON.stringify(coords)));

    if (reviews == null) {
      reviews = [];
    }

    const form = this.createForm(coords, reviews);
    this.map.openBalloon(coords, form.innerHTML, this.setData);
  }

  createForm(coords, reviews) {
    const root = document.createElement('div');
    root.innerHTML = this.formTemplate;
    const reviewForm = root.querySelector('[data-role=review-form]');
    reviewForm.dataset.coords = JSON.stringify(coords);
    const reviewList = root.querySelector('.review-list');

    for (const item of reviews) {
      const div = document.createElement('div');
      div.classList.add('review-item');
      div.innerHTML = `
    <div>
      <b>${item.name}</b> [${item.place}]
    </div>
    <div>${item.text}</div>`;
      reviewList.appendChild(div);
    }
    return root;
  }

  onDocumentClick(e) {
    if (e.target.dataset.role === 'review-add') {
      const reviewForm = document.querySelector('[data-role=review-form]');
      const coords = JSON.parse(reviewForm.dataset.coords);
      const data = {
        coords,
        review: {
          name: document.querySelector('[data-role=review-name]').value,
          place: document.querySelector('[data-role=review-place]').value,
          text: document.querySelector('[data-role=review-text]').value,
        },
      };

      if(data.review.name == '' || data.review.place == '') {
        alert('Строки должны быть заполнены!');
        return; 
      }
      
      let reviews = JSON.parse(sessionStorage.getItem(JSON.stringify(coords)));

      if (reviews == null) {
        reviews = [];
      }
      reviews.push(data.review);


      sessionStorage.setItem(JSON.stringify(coords), JSON.stringify(reviews));

      this.map.createPlacemark(coords);
      this.map.closeBalloon();

    }
  }
}
