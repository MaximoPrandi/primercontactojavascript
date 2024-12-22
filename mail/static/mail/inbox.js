document.addEventListener('DOMContentLoaded', function () {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  document.mail_submit.onsubmit = send_mail;

  // By default, load the inbox
  load_mailbox('inbox');

  // ideally should just ask if the user has new emails and then reload, 
  setInterval(function() {
    if (document.querySelector('#emails-view').style.display === 'block') {
      load_mailbox(document.querySelector('#emails-view').dataset.actualMailbox)
    }
  }, 20000);
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';

  document.querySelector('#compose-title').innerHTML = "New Email";

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  set_tooltip(`compose-recipients`, `tooltip-bottom-compose-recipients`);
}

function answer_email(element) {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';

  document.querySelector('#compose-title').innerHTML = "New answer";

  if (Array.isArray(element.recipients)) {
    document.querySelector('#compose-recipients').value = `${element.recipients.join().replace(document.getElementById('user-email').innerHTML, element.sender)}`;
  } else {
    document.querySelector('#compose-recipients').value = `${element.sender}`;
  }
  if (element.subject.includes("Re: ")) {
    document.querySelector('#compose-subject').value = element.subject;
  } else {
    document.querySelector('#compose-subject').value = `Re: ${element.subject}`;
  }
  document.querySelector('#compose-body').value = `On ${element.timestamp} ${element.sender} wrote: ${element.body}`;

  set_tooltip(`compose-recipients`, `tooltip-bottom-compose-recipients`);
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3 class="pl-2 content-center text-xl">${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Set the actual mailbox into the element
  document.querySelector('#emails-view').dataset.actualMailbox = mailbox;

  return_mails(mailbox).then((response) => {
    response.forEach(element => {
      document.querySelector('#emails-view').append(mail_row_component(element));

      if (element.sender != document.getElementById('user-email').innerHTML) {
        document.getElementById(`${element.id}-re`).addEventListener('click', (element) => alternate_read(element.currentTarget.parentElement.parentElement).then(() => load_mailbox(document.querySelector('#emails-view').dataset.actualMailbox)));
      }
      document.getElementById(`${element.id}-ar`).addEventListener('click', (element) => alternate_archive(element.currentTarget.parentElement.parentElement).then(() => load_mailbox(document.querySelector('#emails-view').dataset.actualMailbox)));

      document.getElementById(`get-email-${element.id}`).addEventListener('click', (element) => load_mail(element.currentTarget.parentElement.parentElement.id) );

      set_tooltip(`${element.id}-re`, `tooltip-content-${element.id}-re`);
      set_tooltip(`${element.id}-ar`, `tooltip-content-${element.id}-ar`);
    });
  });
}

function load_mail(id) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';

  return_mail(id).then((element) => {
    document.querySelector('#email-view').innerHTML = `<h1 class="pl-2 content-center text-2xl">${element.subject}</h3>`;

    document.querySelector('#email-view').append(mail_component(element));

    document.getElementById(`single-${element.id}-ar`).addEventListener('click', (element) => alternate_archive(element.currentTarget.parentElement.parentElement));

    document.getElementById(`compose-answer`).addEventListener('click', (element) => answer_email(JSON.parse(element.currentTarget.dataset.answer)));

    set_tooltip(`single-${element.id}-ar`, `single-tooltip-content-${element.id}-ar`);

    fetch(`/emails/${element.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        read: true
      })
    })
    .catch(error => {
      console.log(error);
    });
  });
}

async function alternate_read(element) {
  if (document.getElementById(element.id).dataset.readStatus == 'read') {
    fetch(`/emails/${element.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        read: false
      })
    })
    .catch(error => {
      console.log(error);
    });
  } else {
    fetch(`/emails/${element.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        read: true
      })
    })
    .catch(error => {
      console.log(error);
    });
  }
}

async function alternate_archive(element) {
  if (document.getElementById(element.id).dataset.archiveStatus == 'archived') {
    fetch(`/emails/${element.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: false
      })
    })
    .catch(error => {
      console.log(error);
    });
  } else {
    fetch(`/emails/${element.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: true
      })
    })
    .catch(error => {
      console.log(error);
    });
  }
}

function send_mail() {
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: document.mail_submit.destinatary.value,
      subject: document.mail_submit.subject.value,
      body: document.mail_submit.body.value
    })
  })
  .then(response => response.json())
  .then(result => {
    // Print result
    load_mailbox('sent');
    return false;
  })
  .catch(error => {
    console.log(error);
  });

  return false;
}

async function return_mails(mailbox) {
  const response = await fetch(`/emails/${mailbox}`);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

async function return_mail(id) {
  const response = await fetch(`/emails/${id}`);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

function set_tooltip(trigger, content) {
  const options = {
      placement: 'bottom',
      triggerType: 'hover',
      onHide: () => {
          console.log('tooltip is shown');
      },
      onShow: () => {
          console.log('tooltip is hidden');
      },
      onToggle: () => {
          console.log('tooltip is toggled');
      },
  };

  const instanceOptions = {
    id: content,
    override: true
  };

  new Tooltip(document.getElementById(content), document.getElementById(trigger), options, instanceOptions);
}

function mail_row_component(element) {
  let component = document.createElement('div');
  let component_html;

  if (element.sender == document.getElementById('user-email').innerHTML) {
    if (element.read == true) {
      if (element.archived == true) {
        component_html = `<div data-archive-status="archived" data-read-status="read" id="${element.id}" class="relative flex items-stretch justify-between bg-gray-50 h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 group hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid relative fa-box-open"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Unarchive email
                </div>
            </button>
          </div>
      </div>`;
      } else {
        component_html = `<div data-archive-status="unarchived" data-read-status="read" id="${element.id}" class="relative flex items-stretch justify-between bg-gray-50 h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                  <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                  ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-box"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Archive email
                </div>
            </button>
          </div>
      </div>`;
      }
    } else {
      if (element.archived == true) {
        component_html = `<div data-archive-status="archived" data-read-status="unread" id="${element.id}" class="relative flex items-stretch justify-between bg-white h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                  <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                  ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 group hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid relative fa-box-open"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Unarchive email
                </div>
            </button>
          </div>
      </div>`;
      } else {
        component_html = `<div data-archive-status="unarchived" data-read-status="unread" id="${element.id}" class="relative flex items-stretch justify-between bg-white h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                  <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                  ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-box"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Archive email
                </div>
            </button>
          </div>
      </div>`;
      }
    }
  } else {
    if (element.read == true) {
      if (element.archived == true) {
        component_html = `<div data-archive-status="archived" data-read-status="read" id="${element.id}" class="relative flex items-stretch justify-between bg-gray-50 h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-re" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-envelope-open"></i>
                <div id="tooltip-content-${element.id}-re" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Mark as unread
                </div>
            </button>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 group hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid relative fa-box-open"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Unarchive email
                </div>
            </button>
          </div>
      </div>`;
      } else {
        component_html = `<div data-archive-status="unarchived" data-read-status="read" id="${element.id}" class="relative flex items-stretch justify-between bg-gray-50 h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                  <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                  ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-re" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-envelope-open"></i>
                <div id="tooltip-content-${element.id}-re" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Mark as unread
                </div>
            </button>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-box"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Archive email
                </div>
            </button>
          </div>
      </div>`;
      }
    } else {
      if (element.archived == true) {
        component_html = `<div data-archive-status="archived" data-read-status="unread" id="${element.id}" class="relative flex items-stretch justify-between bg-white h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                  <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                  ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-re" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-envelope"></i>
                <div id="tooltip-content-${element.id}-re" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Mark as read
                </div>
            </button>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 group hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid relative fa-box-open"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Unarchive email
                </div>
            </button>
          </div>
      </div>`;
      } else {
        component_html = `<div data-archive-status="unarchived" data-read-status="unread" id="${element.id}" class="relative flex items-stretch justify-between bg-white h-10 content-center group hover:shadow-inner hover:drop-shadow	 hover:z-10">
          <div class="pl-2 content-center">
              <button class="w-48">
                  <p class="text-start">${element.sender.split("@")[0]}</p>
              </button>
              <a id="get-email-${element.id}" href="javascript:void(0)" class="hover:no-underline hover:text-black">
                  ${element.subject}
              </a>
          </div>
          <div class="pr-2 content-center">
            <p class="group-hover:hidden">${element.timestamp.split(" ")[1]} ${element.timestamp.split(" ")[0]}</p>
            <button id="${element.id}-re" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-envelope"></i>
                <div id="tooltip-content-${element.id}-re" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Mark as read
                </div>
            </button>
            <button id="${element.id}-ar" data-tooltip-placement="bottom" class="hidden group-hover:inline-block rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                <i class="fa-solid fa-box"></i>
                <div id="tooltip-content-${element.id}-ar" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Archive email
                </div>
            </button>
          </div>
      </div>`;
      }
    }
  }

  component.innerHTML = component_html;
  return component;
}

function mail_component(element) {
  let component = document.createElement('div');
  let component_html;

  if (element.sender == document.getElementById('user-email').innerHTML) {
    if (element.archived == true) {
      component_html = `<div>
        <div data-archive-status="archived" id="${element.id}" class="relative flex items-stretch justify-between p-2">
            <div>
                <p class="text-sm"><span class="text-lg font-medium">${element.sender.split("@")[0]}</span> ${element.sender}</p>
                <p class="text-xs">For ${element.recipients}</p>
            </div>
            <div>
              ${element.timestamp}
              <button id="single-${element.id}-ar" data-tooltip-placement="bottom" class="rounded-full w-8 h-8 group hover:bg-gray-200 hover:text-slate-500">
                  <i class="fa-solid relative fa-box-open"></i>
                  <div id="single-tooltip-bottom-${element.id}" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Unarchive email
                  </div>
              </button>
            </div>
        </div>
        <div class="p-2">
          ${element.body}
        </div>
        <div class="p-2"><button class="btn btn-sm btn-outline-primary" id="compose-answer" data-answer='${JSON.stringify(element)}'>Answer</button></div>
    </div>`;
    } else {
      component_html = `<div>
        <div data-archive-status="archived" id="${element.id}" class="relative flex items-stretch justify-between p-2">
            <div>
                <p class="text-sm"><span class="text-lg font-medium">${element.sender.split("@")[0]}</span> ${element.sender}</p>
                <p class="text-xs">For ${element.recipients}</p>
            </div>
            <div>
              ${element.timestamp}
              <button id="single-${element.id}-ar" data-tooltip-placement="bottom" class="rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                  <i class="fa-solid fa-box"></i>
                  <div id="tooltip-bottom-${element.id}" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                      Archive email
                  </div>
              </button>
            </div>
        </div>
        <div class="p-2">
          <p class="whitespace-pre-wrap">
          ${element.body}
          </p>
        </div>
    </div>`
    };
  } else {
    if (element.archived == true) {
      component_html = `<div>
        <div data-archive-status="archived" id="${element.id}" class="relative flex items-stretch justify-between p-2">
            <div>
                <p class="text-sm"><span class="text-lg font-medium">${element.sender.split("@")[0]}</span> ${element.sender}</p>
                <p class="text-xs">For ${element.recipients}</p>
            </div>
            <div>
              ${element.timestamp}
              <button id="single-${element.id}-ar" data-tooltip-placement="bottom" class="rounded-full w-8 h-8 group hover:bg-gray-200 hover:text-slate-500">
                  <i class="fa-solid relative fa-box-open"></i>
                  <div id="single-tooltip-bottom-${element.id}" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                    Unarchive email
                  </div>
              </button>
            </div>
        </div>
        <div class="p-2">
          ${element.body}
        </div>
        <div class="p-2"><button class="btn btn-sm btn-outline-primary" id="compose-answer" data-answer='${JSON.stringify(element)}'>Answer</button></div>
    </div>`;
    } else {
      component_html = `<div>
        <div data-archive-status="archived" id="${element.id}" class="relative flex items-stretch justify-between p-2">
            <div>
                <p class="text-sm"><span class="text-lg font-medium">${element.sender.split("@")[0]}</span> ${element.sender}</p>
                <p class="text-xs">For ${ element.recipients }</p>
            </div>
            <div>
              ${element.timestamp}
              <button id="single-${element.id}-ar" data-tooltip-placement="bottom" class="rounded-full w-8 h-8 hover:bg-gray-200 hover:text-slate-500">
                  <i class="fa-solid fa-box"></i>
                  <div id="tooltip-bottom-${element.id}" role="tooltip" class="absolute transition-opacity duration-300 opacity-0 z-10 invisible inline-block px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                      Archive email
                  </div>
              </button>
            </div>
        </div>
        <div class="p-2">
          <p class="whitespace-pre-wrap">
          ${element.body}
          </p>
        </div>
        <div class="p-2"><button class="btn btn-sm btn-outline-primary" id="compose-answer" data-answer='${JSON.stringify(element)}'>Answer</button></div>
    </div>`
    };
  }

  component.innerHTML = component_html;
  return component;
}