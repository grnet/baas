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

* the cloud authentication URL
* your user authentication token

If any of the above is missing or the token has expired, BaaS will not be
able to function properly.


GUI
---

Start BaaS. If a cloud configuration is missing, you will be prompted to add
one in `Cloud Settings` section. To get your cloud credentials, browse to
your cloud website, log in and click on `API access`.

* The **Cloud URL** must be provided manually.
* The **User token** can be automatically retrieved, by clicking on
  "Auto-fill token with login". You will just need to authenticate to your
  cloud system.

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

.. External links

.. _BaaS home page: https://www.synnefo.org/baas/
.. _Duplicity: http://duplicity.nongnu.org
