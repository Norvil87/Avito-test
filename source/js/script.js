'use strict';

const KeyCodes = {
  ESC: 'Escape'
};

const TIMEOUT = 3000;

const URL = 'https://boiling-refuge-66454.herokuapp.com/images';

const Status = {
  OK: 200,
  MULTIPLE_CHOICES: 300
};

let gallery = document.querySelector('.gallery__list');
let modalTemplate = document.querySelector('#modal').content.querySelector('.modal');
let modal = modalTemplate.cloneNode(true);
let modalClose = modal.querySelector('.modal__button');
let imageContainer = modal.querySelector('.modal__image-container');
let chat = modal.querySelector('.modal__chat');
let form = modal.querySelector('.modal__form');
let modalButton = modal.querySelector('.modal__button');
let commentField = form.querySelector('#comment');
let nameField = form.querySelector('#name');
let commentTemplate = document.querySelector('#comment-template').content.querySelector('.modal__chat-message-container');
let currentImage;

// Проверяет, произошла ли ошибка при ответе с сервера
function isErrorStatus (xhr) {
  return xhr.status < Status.OK
  || xhr.status > Status.MULTIPLE_CHOICES;
};

// Обрабатывает ответ сервера
function setupRequest (xhr, onLoad, onError) {
xhr.timeout = TIMEOUT;
xhr.responseType = 'json';

xhr.addEventListener('load', function () {

  if (isErrorStatus(xhr)) {
    onError(`Статус ответа: ${xhr.status} ${xhr.statusText}`);
    return;
  }

  onLoad(xhr.response);

  xhr.addEventListener('error', function () {
    onError('Что-то идет не так(');
  });

  xhr.addEventListener('timeout', function () {
    onError(`Запрос не успел выполниться за ${xhr.timeout} мс`);
  });
});
};

// Загрузка данных с сервера
function load(url, onLoad, onError) {
  let xhr = new XMLHttpRequest();

  setupRequest(xhr, onLoad, onError);
  xhr.open('GET', url);
  xhr.send();
};

// Отправка данных на сервер
function send(url, data, onLoad, onError) {
  let xhr = new XMLHttpRequest();

  setupRequest(xhr, onLoad, onError);
  xhr.open('POST', url);

  xhr.send(data);
}

// Возвращает текущий скролл страницы
function getBodyScrollTop() {
  return self.pageYOffset
  || (document.documentElement && document.documentElement.ScrollTop)
  || (document.body && document.body.scrollTop);
}

// Возвращает дату в нужном формате
function parseDate(string) {
  let date = new Date(string);

  let day = date.getDate();
  if (day < 10) { day = `0${day}`};

  let month = date.getMonth() + 1;
  if (month < 10) { month = `0${month}`};

  let year = date.getFullYear();

  return `${day}.${month}.${year}`
}

// Выводит на экран картинку
function renderImage(image) {
  let imgItem = document.createElement('img');
    imgItem.src = image.url;
    imgItem.id = image.id;
    imgItem.alt = `Изображение ${imgItem.id}`;

    return imgItem;
}

// Выводит на экран массив картинок
function renderImages(images) {
  let fragment = new DocumentFragment();

  images.forEach(image => {
    fragment.append(renderImage(image));
  })

  gallery.append(fragment);
}

// Выводит на экран комментарий
function renderComment(comment) {
  let commentItem = commentTemplate.cloneNode(true);
    commentItem.querySelector('.modal__chat-message-date').textContent = parseDate(comment.date);
    commentItem.querySelector('.modal__chat-message-content').textContent = comment.text;

    return commentItem;
}

// Выводит на экран массив комментариев
function renderComments(comments, container) {
  let fragment = new DocumentFragment();
  if (comments) {
    comments.forEach(comment => {
      fragment.append(renderComment(comment));
    })
  }

  container.append(fragment);
}

// Выводит на экран  сообщение об ошибке
function renderError(message) {
  let errorBlock = document.createElement('div');
  errorBlock.classList.add('error');
  errorBlock.textContent = message;
  document.body.insertAdjacentElement('afterbegin', errorBlock);

  setTimeout(function() {
    errorBlock.remove()
  }, TIMEOUT);
}

function onLoadError(message) {
  renderError(message);
}

// Закрытие модального окна по нажатию Esc
function onEscPress(evt) {
  if (evt.code === KeyCodes.ESC) {
    closeModal();
  }
}

// Закрытие модального окна по клику
function onModalClick(evt) {
  if (evt.target === modalClose || evt.target === modal) {
    closeModal();
  }
}

// Очистка модального окна
function clearModal() {
  imageContainer.innerHTML = '';
  chat.innerHTML = '';
  nameField.value = '';
  commentField.value = '';
}

// Закрытие модального окна
function closeModal() {
  clearModal();

  modal.remove();
  document.body.classList.remove('body-locked');
  window.scrollTo(0, document.body.dataset.scrollY);

  document.removeEventListener('keydown', onEscPress)
}

function onModalRender(data) {
  currentImage = data;
  imageContainer.append(renderImage(data));
  renderComments(data.comments, chat);
}

// Выводит на экран модальное окно
function renderModal(image) {
  load(`${URL}/${image.id}`, onModalRender, onLoadError);

  document.body.dataset.scrollY = getBodyScrollTop();
  document.body.style.top = `-${document.body.dataset.scrollY}px`;

  document.body.append(modal);
  document.body.classList.add('body-locked');
  nameField.focus();

  modal.addEventListener('click', onModalClick);
  document.addEventListener('keydown', onEscPress)
}

// Добавяет новый комментарий
function addComment() {
  let commentItem = {};

  commentItem.text = commentField.value;
  commentItem.date = +new Date();

  chat.append(renderComment(commentItem));

  commentField.value = '';
}

function onPageLoad(data) {
  renderImages(data);
}

// инициализирует приложение
function initialize() {
  load(URL, onPageLoad, onLoadError);
}

form.addEventListener('submit', function(evt) {
  send(`${URL}/${currentImage.id}/comments`, new FormData(form), '', onLoadError);
  addComment();
  evt.preventDefault();
});

gallery.addEventListener('click', function(evt) {
  let target = evt.target.closest('img');
  if(!target) return;

  renderModal(target);
});

nameField.addEventListener('change', function() {
  if (nameField.validity.tooShort) {
    nameField.setCustomValidity('Имя должно состоять минимум из двух символов');
  } else if (nameField.validity.tooLong) {
      nameField.setCustomValidity('Имя должно состоять не более чем из 25 символов');
  } else {
    nameField.setCustomValidity('');
  }
})

commentField.addEventListener('invalid', function() {
  if (commentField.validity.valueMissing) {
    commentField.setCustomValidity('А сообщение?');
  } else {
    commentField.setCustomValidity('');
  }
})

modalButton.addEventListener('keydown', function(evt) {
  if(evt.code === "Tab" && !evt.shiftKey) {
    nameField.focus();
    evt.preventDefault();
  }
})

nameField.addEventListener('keydown', function(evt) {
  if(evt.code === "Tab" && evt.shiftKey) {
    modalButton.focus();
    evt.preventDefault();
  }
})

initialize();
