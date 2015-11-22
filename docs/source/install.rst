.. _installation:

Installation
============

There are packages to easily install and run the application in all
major platforms. You can download them from the `BaaS home page`_.

Linux
-----

Untar the BaaS package and run the executable `baas`.


Windows
-------

Unzip the BaaS package and double-click the executable `baas.exe`.

Mac OS X
--------

Unzip the BaaS package and double-click the app `Baas.app`.

.. _setup:

Setup
=====

In order to create your first backup set or to restore
an existing one you will need:

* A synnefo cloud URL
* A user authentication token

If any of the above is missing or is outdated, BaaS will not be able to
function properly.


GUI
---

Start BaaS in GUI mode. If a cloud configuration is missing you will be prompted
to add one in `Cloud Settings` section:

* The **Cloud URL** must be provided manually.
* To get the **User token** click "Login to retrieve token" to authenticate
  with a user name and password. It has to be re-retrieved every time it
  expires or is invalidated in any other way.

Config file
-----------

The config file HOME_DIRECTORY/.baas/clouds.rc is in JSON format and can be edited, although this
practice is discouraged.

Here is a typical example:

.. code-block:: console

    {
        "Okeanos": {
        "name": "Okeanos",
        "auth_url": "https://accounts.okeanos.grnet.gr/identity/v2.0",
        "token": "ex4mpl3-t0k3n",
        "pithos_public": "https://pithos.okeanos.grnet.gr/object-store/v1",
        "uuid": "example-user-id"
        }
    }

CLI
---

BaaS uses `Duplicity`_ as the backend.

Before using it with Synnefo, two environment variables must be set:

.. code-block:: console

    $ export SWIFT_PREAUTHURL = "https://pithos.okeanos.grnet.gr/object-store/v1/<uuid>"
    $ export SWIFT_PREAUTHTOKEN = <user token>

Where uuid is your ~Okeanos user ID.

.. note:: In Windows duplicity runs with Cygwin which is provided with the current installation.

.. External links

.. _BaaS home page: https://www.synnefo.org/baas/
.. _Duplicity: http://duplicity.nongnu.org
